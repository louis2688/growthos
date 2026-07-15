import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { guardStep } from "@/lib/wizard";
import type { Campaign, Channel, Goal } from "@/lib/types";
import ChannelPicker from "./channel-picker";

export const dynamic = "force-dynamic";
// Plan generation + tool recommendations run from this page's server action.
export const maxDuration = 300;

export default async function ChannelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) notFound();

  guardStep(id, (campaign as Campaign).status, "channels");

  const [{ data: goal }, { data: channels }] = await Promise.all([
    db.from("goals").select("*").eq("campaign_id", id).single(),
    db.from("channels").select("*").eq("campaign_id", id).order("confidence"),
  ]);
  if (!goal || !channels?.length) redirect(`/campaigns/${id}/analysis`);

  return (
    <ChannelPicker
      campaign={campaign as Campaign}
      goal={goal as Goal}
      channels={channels as Channel[]}
    />
  );
}
