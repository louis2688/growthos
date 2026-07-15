import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { guardStep } from "@/lib/wizard";
import type { Campaign, Goal } from "@/lib/types";
import AnalysisForm from "./analysis-form";

export const dynamic = "force-dynamic";
// Channel research (web search) runs from this page's server action.
export const maxDuration = 300;

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) notFound();

  guardStep(id, (campaign as Campaign).status, "analysis");

  const { data: goal } = await db.from("goals").select("*").eq("campaign_id", id).single();
  if (!goal) notFound();

  return <AnalysisForm campaign={campaign as Campaign} goal={goal as Goal} />;
}
