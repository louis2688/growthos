import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wizardStep, type Campaign, type Channel, type Goal, type Plan, type Todo } from "@/lib/types";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";
// Regenerate posts its server action to this route and calls Claude.
export const maxDuration = 300;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) notFound();

  // Resumable wizard: an unfinished campaign routes back to its current step.
  const step = wizardStep((campaign as Campaign).status);
  if (step === "review") redirect(`/campaigns/${id}/review`);
  if (step === "channels") redirect(`/campaigns/${id}/channels`);

  const [{ data: goal }, { data: channels }, { data: plans }, { data: todos }] = await Promise.all([
    db.from("goals").select("*").eq("campaign_id", id).single(),
    db.from("channels").select("*").eq("campaign_id", id).eq("selected", true).order("name"),
    db.from("plans").select("*").eq("campaign_id", id),
    db
      .from("todos")
      .select("*")
      .eq("campaign_id", id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);
  if (!goal) notFound();

  return (
    <Dashboard
      campaign={campaign as Campaign}
      goal={goal as Goal}
      channels={(channels ?? []) as Channel[]}
      plans={(plans ?? []) as Plan[]}
      todos={(todos ?? []) as Todo[]}
    />
  );
}
