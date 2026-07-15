"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyzeGoal } from "@/lib/agents/goal-analyzer";
import { researchChannels } from "@/lib/agents/channel-research";
import { generateCampaignPlan } from "@/lib/agents/campaign-generator";
import { recommendTools } from "@/lib/agents/tool-recommender";
import { formatDraft, writePost } from "@/lib/agents/post-writer";
import { createClient, currentUser } from "@/lib/supabase/server";
import type { Channel, Goal, Priority, Tool, TodoStatus } from "@/lib/types";

function isoDateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
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

  let campaignId: string;
  try {
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

  try {
    const research = await researchChannels({
      productName: campaign.name,
      productDescription: campaign.description,
      goal: edited,
    });

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
    return { error: "Channel research failed — your goal is saved. Please try again." };
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
  plan: { id: string; title: string; objective: string; channel: string; platform: string },
  todos: { id: string; title: string; description: string }[],
  catalog: Pick<Tool, "id" | "name" | "category" | "description">[],
): Promise<void> {
  try {
    const rec = await recommendTools({
      plan,
      todos: todos.map((t) => ({ title: t.title, description: t.description })),
      catalog: catalog.map((t) => ({
        name: t.name,
        category: t.category,
        description: t.description,
      })),
    });

    if (rec.tools.length > 0) {
      await db.from("plan_tools").insert(
        rec.tools.map((t) => ({
          plan_id: plan.id,
          tool_id: catalog[t.tool_index].id,
          reason: t.reason,
        })),
      );
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

type PlanForTools = Parameters<typeof suggestToolsForPlan>[1];
type TodosForTools = Parameters<typeof suggestToolsForPlan>[2];

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

  await Promise.all(created.map(({ plan, todos }) => suggestToolsForPlan(db, plan, todos, catalog)));
}

async function activeCatalog(
  db: Awaited<ReturnType<typeof createClient>>,
): Promise<Pick<Tool, "id" | "name" | "category" | "description">[]> {
  // Disabled tools are never suggested.
  const { data } = await db
    .from("tools")
    .select("id, name, category, description")
    .neq("status", "disabled")
    .order("name");
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

  try {
    const result = await generateCampaignPlan({
      productName: campaign.name,
      productDescription: campaign.description,
      goal: goal as Goal,
      channels: selected.map((c) => ({ name: c.name, platform: c.platform, reason: c.reason })),
    });

    // Record the selection; clear any prior attempt's plans (cascade removes todos).
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

  try {
    // Generate BEFORE deleting: a failed generation leaves the campaign untouched.
    const result = await generateCampaignPlan({
      productName: campaign.name,
      productDescription: campaign.description,
      goal: goal as Goal,
      channels: selected.map((c) => ({ name: c.name, platform: c.platform, reason: c.reason })),
    });

    await db.from("plans").delete().eq("campaign_id", campaignId);
    await insertPlansAndTodos(db, campaignId, selected, result.plans, catalog);
  } catch (err) {
    console.error("regenerateCampaign failed:", err);
    revalidatePath(`/campaigns/${campaignId}`);
    return {
      error: "Regeneration failed — the campaign may be missing plans. Click Regenerate to try again.",
    };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
}

/* ---------- Running a todo's tool ---------- */

/**
 * Executes the agent named by the todo's tool.handler and stores what it produced
 * on todos.output. RLS scopes every read here, so a todo the caller doesn't own
 * simply isn't found.
 */
export async function runTodoTool(todoId: string): Promise<{ error: string } | undefined> {
  const db = await createClient();

  const { data: todo } = await db
    .from("todos")
    .select("id, campaign_id, plan_id, title, description, tool_id")
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

  try {
    let output: string;
    switch ((tool as Tool).handler) {
      case "post_writer":
        output = formatDraft(
          await writePost({
            productName: campaign.name,
            productDescription: campaign.description,
            goal: { objective: goal.objective, audience: goal.audience },
            channel,
            plan: { title: plan.title, objective: plan.objective },
            todo: { title: todo.title, description: todo.description },
          }),
        );
        break;
      default:
        return { error: `No handler wired for ${(tool as Tool).name}.` };
    }

    const { error } = await db.from("todos").update({ output }).eq("id", todoId);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error(`runTodoTool failed for todo ${todoId}:`, err);
    // Any previous output is left intact — a failed re-run shouldn't destroy a good draft.
    return { error: `${(tool as Tool).name} failed to run. Please try again.` };
  }

  revalidatePath(`/campaigns/${todo.campaign_id}`);
}

/** Discards a tool run's artifact, e.g. to start over from a clean slate. */
export async function clearTodoOutput(
  todoId: string,
  campaignId: string,
): Promise<{ error: string } | undefined> {
  const db = await createClient();
  const { error } = await db.from("todos").update({ output: null }).eq("id", todoId);
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
