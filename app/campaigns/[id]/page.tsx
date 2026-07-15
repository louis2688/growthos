import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Campaign, Channel, Todo } from "@/lib/types";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";
// Regenerate (Task 8) posts its server action to this route and calls Claude.
export const maxDuration = 300;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) notFound();

  const [{ data: channels }, { data: todos }] = await Promise.all([
    db.from("channels").select("*").eq("campaign_id", id).order("name"),
    db
      .from("todos")
      .select("*")
      .eq("campaign_id", id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);

  return (
    <Dashboard
      campaign={campaign as Campaign}
      channels={(channels ?? []) as Channel[]}
      todos={(todos ?? []) as Todo[]}
    />
  );
}
