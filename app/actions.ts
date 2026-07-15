"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateCampaign, type CampaignGen, type Intake } from "@/lib/generation";
import { createClient, currentUser } from "@/lib/supabase/server";
import type { TodoPriority, TodoStatus } from "@/lib/types";

export type CreateCampaignState = { error: string; values: Intake } | null;

function isoDateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function insertChannelsAndTodos(
  db: SupabaseClient,
  campaignId: string,
  gen: CampaignGen,
): Promise<void> {
  // Normalize: any todo channel the model used but forgot to list still gets a row.
  const channelNames = [...new Set([...gen.channels, ...gen.todos.map((t) => t.channel)])];
  const { data: channels, error: chErr } = await db
    .from("channels")
    .insert(channelNames.map((name) => ({ campaign_id: campaignId, name })))
    .select("id, name");
  if (chErr || !channels) throw new Error(chErr?.message ?? "channel insert failed");

  const idByName = new Map(channels.map((c) => [c.name as string, c.id as string]));
  const { error: tdErr } = await db.from("todos").insert(
    gen.todos.map((t) => ({
      campaign_id: campaignId,
      channel_id: idByName.get(t.channel)!,
      title: t.title,
      description: t.description,
      priority: t.priority,
      tool: t.tool,
      due_date: t.due_in_days != null ? isoDateInDays(t.due_in_days) : null,
    })),
  );
  if (tdErr) throw new Error(tdErr.message);
}

export async function createCampaign(
  _prev: CreateCampaignState,
  formData: FormData,
): Promise<CreateCampaignState> {
  const intake: Intake = {
    productName: String(formData.get("productName") ?? "").trim(),
    productDescription: String(formData.get("productDescription") ?? "").trim(),
    audience: String(formData.get("audience") ?? "").trim(),
    goal: String(formData.get("goal") ?? "").trim(),
    budget: String(formData.get("budget") ?? "").trim() || undefined,
  };
  if (!intake.productName || !intake.productDescription || !intake.audience || !intake.goal) {
    return { error: "Please fill in all required fields.", values: intake };
  }

  const user = await currentUser();
  if (!user) redirect("/login");

  let campaignId: string;
  try {
    const gen = await generateCampaign(intake);
    const db = await createClient();
    const { data: campaign, error } = await db
      .from("campaigns")
      .insert({
        user_id: user.id,
        title: gen.title,
        goal: intake.goal,
        product_name: intake.productName,
        product_description: intake.productDescription,
        audience: intake.audience,
        budget: intake.budget ?? null,
      })
      .select("id")
      .single();
    if (error || !campaign) throw new Error(error?.message ?? "campaign insert failed");

    try {
      await insertChannelsAndTodos(db, campaign.id, gen);
    } catch (childErr) {
      // ponytail: cleanup-on-failure instead of a DB transaction; cascade
      // removes any children that did land, so no partial campaign survives.
      await db.from("campaigns").delete().eq("id", campaign.id);
      throw childErr;
    }
    campaignId = campaign.id;
  } catch (err) {
    console.error("createCampaign failed:", err);
    return {
      error: "Campaign generation failed. Your answers are preserved — please try again.",
      values: intake,
    };
  }

  revalidatePath("/");
  redirect(`/campaigns/${campaignId}`); // must be outside try: redirect() throws internally
}

export type UpdateTodoInput = {
  id: string;
  campaign_id: string;
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  tool?: string | null;
  due_date?: string | null;
  channel_id?: string;
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
  channel_id: string;
  title: string;
  description?: string;
  priority?: TodoPriority;
  tool?: string | null;
  due_date?: string | null;
};

export async function addTodo(input: AddTodoInput): Promise<void> {
  const db = await createClient();
  const { error } = await db.from("todos").insert({
    campaign_id: input.campaign_id,
    channel_id: input.channel_id,
    title: input.title,
    description: input.description ?? "",
    priority: input.priority ?? "medium",
    tool: input.tool ?? null,
    due_date: input.due_date ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/campaigns/${input.campaign_id}`);
}

export async function regenerateCampaign(
  campaignId: string,
): Promise<{ error: string } | undefined> {
  const db = await createClient();
  const { data: campaign } = await db
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (!campaign) return { error: "Campaign not found." };

  let gen: CampaignGen;
  try {
    // Generate BEFORE deleting anything: a failed generation must leave
    // the existing campaign untouched.
    gen = await generateCampaign({
      productName: campaign.product_name,
      productDescription: campaign.product_description,
      audience: campaign.audience,
      goal: campaign.goal,
      budget: campaign.budget ?? undefined,
    });
  } catch (err) {
    console.error("regenerateCampaign failed:", err);
    return { error: "Regeneration failed — your existing campaign is untouched." };
  }

  // ponytail: no transaction — if the rebuild fails after the delete, the
  // campaign is temporarily empty. Accepted deviation: the error tells the
  // user to retry, and retrying is safe because the intake fields still
  // live on the campaign row.
  try {
    // Deleting channels cascades to todos (including manually added ones, per spec).
    const { error: delErr } = await db.from("channels").delete().eq("campaign_id", campaignId);
    if (delErr) throw new Error(delErr.message);
    await insertChannelsAndTodos(db, campaignId, gen);
    const { error: upErr } = await db
      .from("campaigns")
      .update({ title: gen.title })
      .eq("id", campaignId);
    if (upErr) throw new Error(upErr.message);
  } catch (err) {
    console.error("regenerateCampaign failed while rebuilding:", err);
    revalidatePath(`/campaigns/${campaignId}`);
    return {
      error:
        "Regeneration failed while rebuilding — the campaign may be missing todos. Click Regenerate to try again.",
    };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
}
