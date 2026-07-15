import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wizardStep, type Campaign, type Goal } from "@/lib/types";
import ReviewForm from "./review-form";

export const dynamic = "force-dynamic";
// Channel research (web search) runs from this page's server action.
export const maxDuration = 300;

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) notFound();

  const step = wizardStep((campaign as Campaign).status);
  if (step === "channels") redirect(`/campaigns/${id}/channels`);
  if (step === "dashboard") redirect(`/campaigns/${id}`);

  const { data: goal } = await db.from("goals").select("*").eq("campaign_id", id).single();
  if (!goal) notFound();

  return <ReviewForm campaign={campaign as Campaign} goal={goal as Goal} />;
}
