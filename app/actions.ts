"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyzeGoal } from "@/lib/agents/goal-analyzer";
import { researchChannels } from "@/lib/agents/channel-research";
import { generateCampaignPlan } from "@/lib/agents/campaign-generator";
import { recommendTools } from "@/lib/agents/tool-recommender";
import { formatDraft, writePost } from "@/lib/agents/post-writer";
import { formatSeoRewrite, optimizeForSeo } from "@/lib/agents/seo-optimizer";
import { composeEmailDigest, formatEmailDigest } from "@/lib/agents/email-digest";
import { buildUtm, campaignSlug, formatUtm } from "@/lib/agents/utm-builder";
import { formatTiming, recommendTiming } from "@/lib/agents/launch-timing";
import { formatOutreach, writeOutreach } from "@/lib/agents/outreach-writer";
import { formatCompetitorScan, scanCompetitors } from "@/lib/agents/competitor-scan";
import { draftLaunchKit, formatLaunchKit } from "@/lib/agents/ph-launch-kit";
import { formatImagePrompt } from "@/lib/agents/image-prompt";
import {
  IMAGE_BUCKET,
  generateImage,
  imagePath,
  purgeCampaignImages,
} from "@/lib/agents/image-generator";
import {
  CREDIT_COSTS,
  GENERATION_COST,
  REGENERATE_COST,
  creditStatus,
  refundCredits,
  spendCredits,
} from "@/lib/credits";
import { traced } from "@/lib/agents/trace";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient, currentUser } from "@/lib/supabase/server";
import { consumeUserQuota } from "@/lib/rate-limit";
import type { Channel, Goal, Priority, Tool, TodoStatus } from "@/lib/types";

function isoDateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

const QUOTA_MSG =
  "You've hit today's AI usage limit (runs count even when they fail). It resets tomorrow — this cap is what keeps early access free for everyone.";

/**
 * Per-user daily cap in front of every agent-backed action: the second line of defense behind
 * signup, so one scripted account can't hammer the paid search agents or drain the shared
 * Cloudflare allocation. Returns an error string to show the user, or null to proceed.
 * Fail-closed: a limiter outage must not turn authed accounts into blank checks.
 * Pass userId when the caller already fetched the user — saves a duplicate auth round-trip.
 */
async function userQuotaError(kind: "agent" | "search", userId?: string): Promise<string | null> {
  const id = userId ?? (await currentUser())?.id;
  if (!id) return "Your session expired — please log in again.";
  try {
    return (await consumeUserQuota(id, kind)) ? null : QUOTA_MSG;
  } catch {
    return "AI actions are briefly unavailable — please try again shortly.";
  }
}

/**
 * Monthly credit charge — the agreed metering model: one pool, every AI call priced, deducted
 * BEFORE the call, refunded on failure (callers refundCredits in their catch). Returns the
 * charged user id so the failure path knows whom to refund. Sits on top of the daily caps,
 * which stay as abuse backstops and DO count failed attempts. Fail-closed like the quota check.
 */
async function chargeCredits(
  cost: number,
  userId?: string,
): Promise<{ error: string } | { userId: string }> {
  const id = userId ?? (await currentUser())?.id;
  if (!id) return { error: "Your session expired — please log in again." };
  if (cost === 0) return { userId: id };
  try {
    if ((await spendCredits(id, cost)).ok) return { userId: id };
    // Refused: say what this action needs vs what's left — "used all your credits" would be
    // false (and contradict the settings meter) when a cheaper action still works.
    const { spent, allowance } = await creditStatus(id);
    const left = Math.max(0, allowance - spent);
    return {
      error:
        left === 0
          ? `You've used all ${allowance} of this month's AI credits — they reset on the 1st. Paid top-ups arrive with billing.`
          : `Not enough credits for this — it needs ${cost} and you have ${left} of ${allowance} left this month. Cheaper actions still work; everything resets on the 1st.`,
    };
  } catch {
    return { error: "AI actions are briefly unavailable — please try again shortly." };
  }
}

/* ---------- Step 1: /new — analyze the goal ---------- */

export type StartCampaignState = {
  error: string;
  values: { name: string; description: string; rawGoal: string };
} | null;

export async function startCampaign(
  _prev: StartCampaignState,
  formData: FormData,
): Promise<StartCampaignState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    rawGoal: String(formData.get("rawGoal") ?? "").trim(),
  };
  if (!values.name || !values.description || !values.rawGoal) {
    return { error: "Please fill in all fields.", values };
  }
  const user = await currentUser();
  if (!user) redirect("/login");
  const quotaErr = await userQuotaError("agent", user.id);
  if (quotaErr) return { error: quotaErr, values };

  let campaignId: string;
  try {
    // Not traced: this runs before the campaign row exists, and agent_runs is owner-scoped
    // through campaign_id. Creating the campaign first just to trace would leave an orphan
    // draft with no goal if analysis failed. It's also the cheapest agent — no web search,
    // small output. The ones that actually fail mysteriously all have a campaign to hang off.
    const analysis = await analyzeGoal({
      productName: values.name,
      productDescription: values.description,
      rawGoal: values.rawGoal,
    });

    const db = await createClient();
    const { data: campaign, error } = await db
      .from("campaigns")
      .insert({ user_id: user.id, name: values.name, description: values.description })
      .select("id")
      .single();
    if (error || !campaign) throw new Error(error?.message ?? "campaign insert failed");

    const { error: goalErr } = await db.from("goals").insert({
      campaign_id: campaign.id,
      objective: analysis.objective,
      target_metric: analysis.target_metric,
      target_value: analysis.target_value,
      timeframe: analysis.timeframe,
      success_definition: analysis.success_definition,
      audience: analysis.audience,
      kpis: analysis.kpis,
      validation_note: analysis.validation_note,
    });
    if (goalErr) {
      await db.from("campaigns").delete().eq("id", campaign.id); // no partial campaigns
      throw new Error(goalErr.message);
    }
    campaignId = campaign.id;
  } catch (err) {
    console.error("startCampaign failed:", err);
    return { error: "Goal analysis failed. Your answers are preserved — please try again.", values };
  }

  revalidatePath("/");
  redirect(`/campaigns/${campaignId}/analysis`);
}

/* ---------- Step 2: /analysis — confirm goal, research channels ---------- */

export type ConfirmGoalState = { error: string } | null;

export async function confirmGoal(
  _prev: ConfirmGoalState,
  formData: FormData,
): Promise<ConfirmGoalState> {
  const campaignId = String(formData.get("campaignId") ?? "");
  const db = await createClient();

  const { data: campaign } = await db
    .from("campaigns")
    .select("id, name, description, status")
    .eq("id", campaignId)
    .single();
  if (!campaign) return { error: "Campaign not found." };

  // Persist the user's edits to the analysis before researching.
  const edited = {
    objective: String(formData.get("objective") ?? "").trim(),
    target_metric: String(formData.get("target_metric") ?? "").trim(),
    target_value: String(formData.get("target_value") ?? "").trim(),
    timeframe: String(formData.get("timeframe") ?? "").trim(),
    audience: String(formData.get("audience") ?? "").trim(),
    success_definition: String(formData.get("success_definition") ?? "").trim(),
  };
  if (!edited.objective || !edited.audience) {
    return { error: "Objective and audience are required." };
  }
  const { error: upErr } = await db.from("goals").update(edited).eq("campaign_id", campaignId);
  if (upErr) return { error: upErr.message };

  // After the goal update on purpose: a quota-blocked user keeps their edits.
  const quotaErr = await userQuotaError("search");
  if (quotaErr) return { error: quotaErr };

  // The generation charge lands here — the step that fires the paid web search. It covers the
  // whole wizard (research + plan generation); the later generatePlans step charges nothing so
  // a retry after a plan-generation failure stays free.
  const charge = await chargeCredits(GENERATION_COST);
  if ("error" in charge) return { error: charge.error };

  try {
    const research = await traced(db, { agent: "channel_research", campaign_id: campaignId }, () =>
      researchChannels({
        productName: campaign.name,
        productDescription: campaign.description,
        goal: edited,
      }),
    );

    // Idempotent on retry: clear any channels from a previous attempt.
    await db.from("channels").delete().eq("campaign_id", campaignId);
    const { error: chErr } = await db.from("channels").insert(
      research.channels.map((c) => ({
        campaign_id: campaignId,
        name: c.name,
        platform: c.platform,
        type: c.type,
        reason: c.reason,
        confidence: c.confidence,
      })),
    );
    if (chErr) throw new Error(chErr.message);

    const { error: stErr } = await db
      .from("campaigns")
      .update({ status: "researching", updated_at: new Date().toISOString() })
      .eq("id", campaignId);
    if (stErr) throw new Error(stErr.message);
  } catch (err) {
    console.error("confirmGoal failed:", err);
    await refundCredits(charge.userId, GENERATION_COST);
    return {
      error: "Channel research failed — your goal is saved and your credits were returned. Please try again.",
    };
  }

  redirect(`/campaigns/${campaignId}/channels`);
}

/* ---------- Step 3: /channels — select, generate plans, todos and tool suggestions ---------- */

export type GeneratePlansState = { error: string } | null;

/**
 * Tool Recommender, once per plan (campaign-agent-mastra.html `.foreach(plan)`).
 * Best-effort: a plan whose suggestions fail keeps its todos and simply shows no
 * tools, rather than discarding a good generation over an enhancement.
 */
async function suggestToolsForPlan(
  db: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  plan: PlanForTools,
  todos: TodosForTools,
  catalog: Pick<Tool, "id" | "name" | "category" | "description">[],
): Promise<void> {
  try {
    const rec = await traced(db, { agent: "tool_recommender", campaign_id: campaignId }, () =>
      recommendTools({
        plan,
        todos: todos.map((t) => ({ title: t.title, description: t.description })),
        catalog: catalog.map((t) => ({
          name: t.name,
          category: t.category,
          description: t.description,
        })),
      }),
    );

    // The model can name the same tool twice; plan_tools is unique(plan_id, tool_id), so
    // an un-deduped batch insert fails wholesale and drops EVERY suggestion for the plan.
    // Keep the first mention of each tool.
    const seen = new Set<string>();
    const rows = rec.tools
      .filter((t) => {
        const id = catalog[t.tool_index].id;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((t) => ({ plan_id: plan.id, tool_id: catalog[t.tool_index].id, reason: t.reason }));

    if (rows.length > 0) {
      // insert() doesn't throw without throwOnError(), so the outer catch never sees a
      // failed insert — check it here or the failure is invisible.
      const { error } = await db.from("plan_tools").insert(rows);
      if (error) console.error(`plan_tools insert failed for plan ${plan.id}:`, error.message);
    }
    // Last assignment wins if the model names a todo twice.
    for (const a of rec.todo_tools) {
      await db
        .from("todos")
        .update({ tool_id: catalog[a.tool_index].id })
        .eq("id", todos[a.todo_index].id);
    }
  } catch (err) {
    console.error(`tool recommendation failed for plan ${plan.id}:`, err);
  }
}

type PlanForTools = { id: string; title: string; objective: string; channel: string; platform: string };
type TodosForTools = { id: string; title: string; description: string }[];

async function insertPlansAndTodos(
  db: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  selected: Channel[],
  plans: Awaited<ReturnType<typeof generateCampaignPlan>>["plans"],
  catalog: Pick<Tool, "id" | "name" | "category" | "description">[],
): Promise<void> {
  const created: { plan: PlanForTools; todos: TodosForTools }[] = [];

  for (const p of plans) {
    const channel = selected[p.channel_index];
    const { data: plan, error: planErr } = await db
      .from("plans")
      .insert({
        campaign_id: campaignId,
        channel_id: channel.id,
        title: p.title,
        objective: p.objective,
        priority: p.priority,
      })
      .select("id")
      .single();
    if (planErr || !plan) throw new Error(planErr?.message ?? "plan insert failed");

    const { data: todos, error: tdErr } = await db
      .from("todos")
      .insert(
        p.todos.map((t) => ({
          campaign_id: campaignId,
          plan_id: plan.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          estimated_time: t.estimated_time ?? null,
          due_date: t.due_in_days != null ? isoDateInDays(t.due_in_days) : null,
        })),
      )
      .select("id, title, description");
    if (tdErr || !todos) throw new Error(tdErr?.message ?? "todo insert failed");

    created.push({
      plan: {
        id: plan.id,
        title: p.title,
        objective: p.objective,
        channel: channel.name,
        platform: channel.platform,
      },
      todos,
    });
  }

  await Promise.all(
    created.map(({ plan, todos }) => suggestToolsForPlan(db, campaignId, plan, todos, catalog)),
  );
}

async function activeCatalog(
  db: Awaited<ReturnType<typeof createClient>>,
): Promise<Pick<Tool, "id" | "name" | "category" | "description">[]> {
  // Disabled tools are never suggested. throwOnError so a failed read can't masquerade
  // as an empty catalog — that would generate (or REGENERATE over) a campaign with no
  // tools and no error. The callers' try/catch turns the throw into a retry message.
  const { data } = await db
    .from("tools")
    .select("id, name, category, description")
    .neq("status", "disabled")
    .order("name")
    .throwOnError();
  return (data ?? []) as Pick<Tool, "id" | "name" | "category" | "description">[];
}

export async function generatePlans(
  _prev: GeneratePlansState,
  formData: FormData,
): Promise<GeneratePlansState> {
  const campaignId = String(formData.get("campaignId") ?? "");
  const selectedIds = formData.getAll("channelIds").map(String);
  if (selectedIds.length < 2 || selectedIds.length > 6) {
    return { error: "Select between 2 and 6 channels." };
  }

  const db = await createClient();
  const [{ data: campaign }, { data: goal }, { data: channels }, catalog] = await Promise.all([
    db.from("campaigns").select("id, name, description").eq("id", campaignId).single(),
    db.from("goals").select("*").eq("campaign_id", campaignId).single(),
    db.from("channels").select("*").eq("campaign_id", campaignId),
    activeCatalog(db),
  ]);
  if (!campaign || !goal || !channels?.length) return { error: "Campaign not found." };

  const selected = (channels as Channel[]).filter((c) => selectedIds.includes(c.id));
  if (selected.length !== selectedIds.length) return { error: "Unknown channel selected." };

  const quotaErr = await userQuotaError("agent");
  if (quotaErr) return { error: quotaErr };

  // Free ONLY when the campaign has no plans yet — the wizard's 10cr at confirmGoal covers the
  // first generation, and a retry after a failed generation finds the plans wiped, so it stays
  // free too. If plans exist, this IS a regenerate (reachable via Back-to-channels or a direct
  // action call) and gets the regenerate price — otherwise the 2cr button is free by detour.
  const { count: planCount } = await db
    .from("plans")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);
  const generateCost = (planCount ?? 0) > 0 ? REGENERATE_COST : 0;
  const charge = await chargeCredits(generateCost);
  if ("error" in charge) return { error: charge.error };

  try {
    const result = await traced(db, { agent: "campaign_generator", campaign_id: campaignId }, () =>
      generateCampaignPlan({
        productName: campaign.name,
        productDescription: campaign.description,
        goal: goal as Goal,
        channels: selected.map((c) => ({ name: c.name, platform: c.platform, reason: c.reason })),
      }),
    );

    // Record the selection; clear any prior attempt's plans (cascade removes todos).
    // The cascade takes the todo rows but not their storage objects — purge the campaign's
    // image folder first (every image belongs to a todo being replaced), or the public-by-URL
    // objects outlive their rows. Best-effort: campaign/account deletion re-purges the whole
    // folder fail-closed, so a blip here can't outlive the account.
    await purgeCampaignImages(createServiceClient().storage.from(IMAGE_BUCKET), campaignId);
    await db.from("channels").update({ selected: false }).eq("campaign_id", campaignId);
    await db.from("channels").update({ selected: true }).in("id", selectedIds);
    await db.from("plans").delete().eq("campaign_id", campaignId);

    await insertPlansAndTodos(db, campaignId, selected, result.plans, catalog);

    // Not live yet — the user reviews the generated plans before they commit.
    const { error: stErr } = await db
      .from("campaigns")
      .update({ status: "reviewing", updated_at: new Date().toISOString() })
      .eq("id", campaignId);
    if (stErr) throw new Error(stErr.message);
  } catch (err) {
    console.error("generatePlans failed:", err);
    // Clear half-written plans so a retry starts clean; selection is preserved.
    await db.from("plans").delete().eq("campaign_id", campaignId);
    await refundCredits(charge.userId, generateCost);
    return { error: "Plan generation failed — your channel picks are saved. Please try again." };
  }

  revalidatePath("/");
  redirect(`/campaigns/${campaignId}/review`);
}

/* ---------- Step 4: /review — commit the generated campaign ---------- */

export async function confirmCampaign(campaignId: string): Promise<{ error: string } | undefined> {
  const db = await createClient();
  const { error } = await db
    .from("campaigns")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (error) return { error: error.message };

  revalidatePath("/");
  redirect(`/campaigns/${campaignId}`);
}

/** Step back to channel selection; the draft plans stay until the next generate replaces them. */
export async function backToChannels(campaignId: string): Promise<{ error: string } | undefined> {
  const db = await createClient();
  const { error } = await db
    .from("campaigns")
    .update({ status: "researching", updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (error) return { error: error.message };

  redirect(`/campaigns/${campaignId}/channels`);
}

/* ---------- Regenerate: re-run generation from saved goal + selection ---------- */

export async function regenerateCampaign(
  campaignId: string,
): Promise<{ error: string } | undefined> {
  const db = await createClient();
  const [{ data: campaign }, { data: goal }, { data: channels }, catalog] = await Promise.all([
    db.from("campaigns").select("id, name, description").eq("id", campaignId).single(),
    db.from("goals").select("*").eq("campaign_id", campaignId).single(),
    db.from("channels").select("*").eq("campaign_id", campaignId).eq("selected", true),
    activeCatalog(db),
  ]);
  if (!campaign || !goal) return { error: "Campaign not found." };
  const selected = (channels ?? []) as Channel[];
  if (selected.length === 0) return { error: "No selected channels to regenerate from." };

  const quotaErr = await userQuotaError("agent");
  if (quotaErr) return { error: quotaErr };
  // Cheap on purpose: regenerate reuses the researched channels, no new web search.
  const charge = await chargeCredits(REGENERATE_COST);
  if ("error" in charge) return { error: charge.error };

  try {
    // Generate BEFORE deleting: a failed generation leaves the campaign untouched.
    const result = await traced(db, { agent: "campaign_generator", campaign_id: campaignId }, () =>
      generateCampaignPlan({
        productName: campaign.name,
        productDescription: campaign.description,
        goal: goal as Goal,
        channels: selected.map((c) => ({ name: c.name, platform: c.platform, reason: c.reason })),
      }),
    );

    // Same as generatePlans: the plan wipe cascades the todo rows, so their images must go
    // first or they orphan publicly (best-effort; deletion re-purges the folder).
    await purgeCampaignImages(createServiceClient().storage.from(IMAGE_BUCKET), campaignId);
    await db.from("plans").delete().eq("campaign_id", campaignId);
    await insertPlansAndTodos(db, campaignId, selected, result.plans, catalog);
  } catch (err) {
    console.error("regenerateCampaign failed:", err);
    await refundCredits(charge.userId, REGENERATE_COST);
    revalidatePath(`/campaigns/${campaignId}`);
    return {
      error: "Regeneration failed — the campaign may be missing plans and your credits were returned. Click Regenerate to try again.",
    };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
}

/* ---------- Campaign lifecycle ---------- */

/**
 * Hides a campaign without destroying it. Only offered on the dashboard, which only renders
 * for an active campaign — so restoreCampaign can always safely put it back to 'active'
 * without needing to remember what it was.
 */
export async function archiveCampaign(campaignId: string): Promise<{ error: string } | undefined> {
  const db = await createClient();
  const { error } = await db
    .from("campaigns")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (error) return { error: error.message };

  revalidatePath("/");
  redirect("/");
}

export async function restoreCampaign(campaignId: string): Promise<{ error: string } | undefined> {
  const db = await createClient();
  const { error } = await db
    .from("campaigns")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (error) return { error: error.message };

  revalidatePath("/");
}

/**
 * Permanent. Goals, channels, plans, todos, plan_tools and agent_runs all cascade from
 * campaigns, so this removes the whole tree — including any drafts a tool produced.
 * RLS scopes the delete, so a campaign the caller doesn't own simply matches nothing.
 */
export async function deleteCampaign(campaignId: string): Promise<{ error: string } | undefined> {
  const db = await createClient();
  // RLS-scoped read AUTHORIZES the service-client storage purge below: only the owner can see
  // the campaign, so this action can't be used to delete another user's images by id.
  const { data: campaign } = await db.from("campaigns").select("id").eq("id", campaignId).single();
  if (!campaign) return { error: "Campaign not found." };

  // Purge generated images BEFORE the row delete: the bucket is public-by-URL, so an orphaned
  // object would stay readable forever with no DB record pointing at it (the privacy policy
  // promises deletion removes them). Fail-closed, NOT best-effort: once the row is gone there
  // is no path left that can ever reach this folder again, so a silent purge failure would be
  // a permanent breach — while failing here just means the user retries the delete.
  const { error: purgeError } = await purgeCampaignImages(
    createServiceClient().storage.from(IMAGE_BUCKET),
    campaignId,
  );
  if (purgeError) {
    return { error: "Couldn't remove this campaign's generated images — try deleting again." };
  }

  const { error } = await db.from("campaigns").delete().eq("id", campaignId);
  if (error) return { error: error.message };

  revalidatePath("/");
  redirect("/");
}

/* ---------- Running a todo's tool ---------- */

/**
 * The campaign's real progress: only todos actually marked done count as milestones.
 * The email agent is told this list is its whole factual record, so anything wrong
 * here becomes a fabricated claim to subscribers.
 */
async function campaignMilestones(
  db: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
): Promise<{ milestones: { title: string; plan: string }[]; progress: { done: number; total: number } }> {
  const [{ data: todos, error: todoErr }, { data: plans, error: planErr }] = await Promise.all([
    db.from("todos").select("title, status, plan_id").eq("campaign_id", campaignId),
    db.from("plans").select("id, title").eq("campaign_id", campaignId),
  ]);
  // Coercing a failed read to [] would tell the agent "nothing is done yet" and it would
  // sincerely write that to subscribers. Fail loudly instead — the caller's catch handles it.
  if (todoErr || planErr || !todos || !plans) {
    throw new Error(`Could not read campaign progress: ${todoErr?.message ?? planErr?.message}`);
  }

  const planTitle = new Map(plans.map((p) => [p.id, p.title as string]));
  const all = todos;
  const done = all.filter((t) => t.status === "done");

  return {
    milestones: done.map((t) => ({ title: t.title, plan: planTitle.get(t.plan_id) ?? "" })),
    progress: { done: done.length, total: all.length },
  };
}

/**
 * Executes the agent named by the todo's tool.handler and stores what it produced
 * on todos.output. RLS scopes every read here, so a todo the caller doesn't own
 * simply isn't found.
 */
export async function runTodoTool(todoId: string): Promise<{ error: string } | undefined> {
  const db = await createClient();

  const { data: todo } = await db
    .from("todos")
    .select("id, campaign_id, plan_id, title, description, tool_id, output_image_url")
    .eq("id", todoId)
    .single();
  if (!todo) return { error: "Todo not found." };
  if (!todo.tool_id) return { error: "This todo has no tool assigned." };

  const [{ data: tool }, { data: plan }, { data: campaign }, { data: goal }] = await Promise.all([
    db.from("tools").select("*").eq("id", todo.tool_id).single(),
    db.from("plans").select("id, title, objective, channel_id").eq("id", todo.plan_id).single(),
    db.from("campaigns").select("name, description").eq("id", todo.campaign_id).single(),
    db.from("goals").select("objective, audience").eq("campaign_id", todo.campaign_id).single(),
  ]);
  if (!tool || !plan || !campaign || !goal) return { error: "Campaign data is incomplete." };
  if (!(tool as Tool).handler) {
    return { error: `${(tool as Tool).name} can't be run yet — it's catalog-only for now.` };
  }

  const { data: channel } = await db
    .from("channels")
    .select("name, platform, type")
    .eq("id", plan.channel_id)
    .single();
  if (!channel) return { error: "Campaign data is incomplete." };

  const handler = (tool as Tool).handler!;

  // utm_builder is pure code now — no AI call, so per the credit rule it costs nothing and
  // skips the metered path entirely. It still clears a stale image if the todo was reassigned
  // from the image tool (same cleanup as the metered path below).
  if (handler === "utm_builder") {
    const slug = campaignSlug(campaign.name);
    const output = formatUtm(
      buildUtm({ channel, todo: { title: todo.title, description: todo.description }, campaign: slug }),
      slug,
    );
    if (todo.output_image_url) {
      await createServiceClient()
        .storage.from(IMAGE_BUCKET)
        .remove([imagePath(todo.campaign_id, todo.id)]);
    }
    const { error } = await db
      .from("todos")
      .update({ output, output_tool_id: todo.tool_id, output_image_url: null })
      .eq("id", todoId);
    if (error) return { error: error.message };
    revalidatePath(`/campaigns/${todo.campaign_id}`);
    return;
  }

  // launch_timing and competitor_scan are the paid Anthropic web-search paths; everything
  // else runs on the Cloudflare pool.
  const quotaErr = await userQuotaError(
    handler === "launch_timing" || handler === "competitor_scan" ? "search" : "agent",
  );
  if (quotaErr) return { error: quotaErr };
  const charge = await chargeCredits(CREDIT_COSTS[handler]);
  if ("error" in charge) return { error: charge.error };

  try {
    const shared = {
      productName: campaign.name,
      productDescription: campaign.description,
      goal: { objective: goal.objective, audience: goal.audience },
      plan: { title: plan.title, objective: plan.objective },
      todo: { title: todo.title, description: todo.description },
    };

    // One trace per tool run, keyed by handler, carrying the todo so a failure is traceable
    // to the exact thing the user clicked Run on.
    const output = await traced(
      db,
      { agent: (tool as Tool).handler!, campaign_id: todo.campaign_id, todo_id: todo.id },
      async () => {
        switch ((tool as Tool).handler) {
          case "post_writer":
            return formatDraft(await writePost({ ...shared, channel }));

          case "seo_optimizer":
            return formatSeoRewrite(await optimizeForSeo({ ...shared, channel }));

          case "email_digest":
            return formatEmailDigest(
              await composeEmailDigest({
                ...shared,
                ...(await campaignMilestones(db, todo.campaign_id)),
              }),
            );

          case "launch_timing":
            return formatTiming(
              await recommendTiming({
                productName: shared.productName,
                goal: shared.goal,
                channel,
                plan: shared.plan,
                todo: shared.todo,
              }),
            );

          case "outreach_writer":
            return formatOutreach(await writeOutreach({ ...shared, channel }));

          case "competitor_scan":
            return formatCompetitorScan(await scanCompetitors({ ...shared, channel }));

          // Deliberately no channel: the kit is about the PH listing itself, which is the
          // same whichever channel's plan this todo sits under.
          case "ph_launch_kit":
            return formatLaunchKit(await draftLaunchKit(shared));

          case "image_generator": {
            // Unlike every other handler, this produces a binary. Upload it here (inside the
            // trace, so a failed render/upload is recorded), then return the text artifact —
            // prompt, alt, notes — which is what todos.output stores. The image itself is
            // reached via output_image_url, set on the update below.
            //
            // Service-role client for the upload: @supabase/ssr doesn't attach the user's JWT
            // to storage requests (only to DB ones), so the request-scoped `db` uploads as
            // anon and the bucket's RLS rejects it. Authorization is already done — `todo` was
            // read through RLS above, so we're only here for a todo this user owns, and the
            // path is built from that todo's ids. See lib/supabase/service.ts.
            const { prompt, bytes } = await generateImage({ ...shared, channel });
            // The render took up to 60s — recheck the todo row (RLS) before the service-role
            // upload, so a campaign or account deleted mid-render can't receive a fresh object
            // AFTER its folder purge ran. ponytail: a ms-wide check-to-upload window remains;
            // closing it needs storage lifecycle rules the bucket doesn't have.
            const { data: stillOwned } = await db
              .from("todos")
              .select("id")
              .eq("id", todo.id)
              .single();
            if (!stillOwned) throw new Error("Todo was deleted while the image rendered.");
            const { error: upErr } = await createServiceClient()
              .storage.from(IMAGE_BUCKET)
              .upload(imagePath(todo.campaign_id, todo.id), bytes, {
                contentType: "image/jpeg",
                upsert: true, // a re-run overwrites the same path rather than orphaning the old one
                cacheControl: "60", // low, so a re-run isn't masked by a stale CDN copy
              });
            if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);
            return formatImagePrompt(prompt);
          }

          default:
            throw new Error(`No handler wired for ${(tool as Tool).name}.`);
        }
      },
    );

    // The image handler uploaded to a deterministic path; getPublicUrl just derives its URL
    // (no I/O). Set for image_generator, cleared to null for every other handler so a todo
    // reassigned from the image tool to a text tool doesn't keep showing a stale picture.
    const imageUrl =
      (tool as Tool).handler === "image_generator"
        ? db.storage.from(IMAGE_BUCKET).getPublicUrl(imagePath(todo.campaign_id, todo.id)).data
            .publicUrl
        : null;

    // Nulling the column alone would strand the old object: public-by-URL, no DB reference,
    // and clearTodoOutput can never reach it again (it gates on output_image_url). Best-effort
    // like clearTodoOutput — deletion re-purges the folder if this blips.
    if (!imageUrl && todo.output_image_url) {
      await createServiceClient()
        .storage.from(IMAGE_BUCKET)
        .remove([imagePath(todo.campaign_id, todo.id)]);
    }

    // Stamp provenance with the artifact so the UI can never caption a draft with a
    // tool that didn't write it.
    const { error } = await db
      .from("todos")
      .update({ output, output_tool_id: todo.tool_id, output_image_url: imageUrl })
      .eq("id", todoId);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error(`runTodoTool failed for todo ${todoId}:`, err);
    await refundCredits(charge.userId, CREDIT_COSTS[handler]);
    // Any previous output is left intact — a failed re-run shouldn't destroy a good draft.
    return { error: `${(tool as Tool).name} failed to run — your credits were returned. Please try again.` };
  }

  revalidatePath(`/campaigns/${todo.campaign_id}`);
}

/** Discards a tool run's artifact, e.g. to start over from a clean slate. */
export async function clearTodoOutput(
  todoId: string,
  campaignId: string,
): Promise<{ error: string } | undefined> {
  const db = await createClient();
  // RLS-scoped read authorizes the service-client image removal below, and supplies the REAL
  // campaign_id for the storage path rather than trusting the caller's parameter.
  const { data: todo } = await db
    .from("todos")
    .select("id, campaign_id, output_image_url")
    .eq("id", todoId)
    .single();
  if (!todo) return { error: "Todo not found." };

  // Discarding an image output also deletes the object — the bucket is public-by-URL, so
  // leaving it would keep a "discarded" image readable forever. Best-effort.
  if (todo.output_image_url) {
    try {
      await createServiceClient()
        .storage.from(IMAGE_BUCKET)
        .remove([imagePath(todo.campaign_id, todo.id)]);
    } catch {
      // The column clear below still hides it from the UI.
    }
  }

  const { error } = await db
    .from("todos")
    .update({ output: null, output_tool_id: null, output_image_url: null })
    .eq("id", todoId);
  if (error) return { error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
}

/* ---------- Todo mutations ---------- */

export type UpdateTodoInput = {
  id: string;
  campaign_id: string;
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: Priority;
  estimated_time?: string | null;
  due_date?: string | null;
  plan_id?: string;
  tool_id?: string | null;
};

export async function updateTodo(input: UpdateTodoInput): Promise<void> {
  const { id, campaign_id, ...fields } = input;
  const db = await createClient();
  const { error } = await db.from("todos").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/campaigns/${campaign_id}`);
}

export type AddTodoInput = {
  campaign_id: string;
  plan_id: string;
  title: string;
  description?: string;
  priority?: Priority;
  estimated_time?: string | null;
  due_date?: string | null;
  tool_id?: string | null;
};

export async function addTodo(input: AddTodoInput): Promise<void> {
  const db = await createClient();
  const { error } = await db.from("todos").insert({
    campaign_id: input.campaign_id,
    plan_id: input.plan_id,
    title: input.title,
    description: input.description ?? "",
    priority: input.priority ?? "medium",
    estimated_time: input.estimated_time ?? null,
    due_date: input.due_date ?? null,
    tool_id: input.tool_id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/campaigns/${input.campaign_id}`);
}
