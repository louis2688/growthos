import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { guardStep } from "@/lib/wizard";
import type { Campaign, Channel, Plan, Todo, Tool } from "@/lib/types";
import Board from "./board";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) notFound();

  guardStep(id, (campaign as Campaign).status, "dashboard");

  const [{ data: channels }, { data: plans }, { data: todos }, { data: tools }] = await Promise.all([
    db.from("channels").select("*").eq("campaign_id", id).eq("selected", true).order("name"),
    db.from("plans").select("*").eq("campaign_id", id),
    db
      .from("todos")
      .select("*")
      .eq("campaign_id", id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    db.from("tools").select("*").order("name"),
  ]);

  return (
    <Board
      campaign={campaign as Campaign}
      channels={(channels ?? []) as Channel[]}
      plans={(plans ?? []) as Plan[]}
      todos={(todos ?? []) as Todo[]}
      tools={(tools ?? []) as Tool[]}
    />
  );
}
