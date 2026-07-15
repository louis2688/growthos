import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { guardStep } from "@/lib/wizard";
import type { Campaign, Channel, Goal, Plan, PlanTool, Todo, Tool } from "@/lib/types";
import ReviewPreview from "./review-preview";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) notFound();

  guardStep(id, (campaign as Campaign).status, "review");

  const [{ data: goal }, { data: channels }, { data: plans }, { data: todos }, { data: tools }] =
    await Promise.all([
      db.from("goals").select("*").eq("campaign_id", id).single(),
      db.from("channels").select("*").eq("campaign_id", id).eq("selected", true),
      db.from("plans").select("*").eq("campaign_id", id),
      db
        .from("todos")
        .select("*")
        .eq("campaign_id", id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      db.from("tools").select("*"),
    ]);
  if (!goal) notFound();

  const planIds = ((plans ?? []) as Plan[]).map((p) => p.id);
  const { data: planTools } = planIds.length
    ? await db.from("plan_tools").select("*").in("plan_id", planIds)
    : { data: [] };

  return (
    <ReviewPreview
      campaign={campaign as Campaign}
      goal={goal as Goal}
      channels={(channels ?? []) as Channel[]}
      plans={(plans ?? []) as Plan[]}
      todos={(todos ?? []) as Todo[]}
      tools={(tools ?? []) as Tool[]}
      planTools={(planTools ?? []) as PlanTool[]}
    />
  );
}
