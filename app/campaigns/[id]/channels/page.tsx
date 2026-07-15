import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wizardStep, type Campaign, type Channel, type Goal } from "@/lib/types";
import ChannelPicker from "./channel-picker";

export const dynamic = "force-dynamic";
// Plan generation runs from this page's server action.
export const maxDuration = 300;

export default async function ChannelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) notFound();

  const step = wizardStep((campaign as Campaign).status);
  if (step === "review") redirect(`/campaigns/${id}/review`);
  if (step === "dashboard") redirect(`/campaigns/${id}`);

  const [{ data: goal }, { data: channels }] = await Promise.all([
    db.from("goals").select("*").eq("campaign_id", id).single(),
    db.from("channels").select("*").eq("campaign_id", id).order("confidence"),
  ]);
  if (!goal || !channels?.length) redirect(`/campaigns/${id}/review`);

  return (
    <ChannelPicker
      campaign={campaign as Campaign}
      goal={goal as Goal}
      channels={channels as Channel[]}
    />
  );
}
