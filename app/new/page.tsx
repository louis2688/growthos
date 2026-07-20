import { createClient, currentUser } from "@/lib/supabase/server";
import { goalSeed } from "@/lib/wizard";
import type { Goal } from "@/lib/types";
import IntakeForm, { type IntakeValues } from "./intake-form";

// Claude generation with adaptive thinking can take 1-3 minutes; the server
// action POSTs to this route, so it needs a long function timeout on Vercel.
export const maxDuration = 300;

/**
 * ?from=<campaignId> seeds the form from a past campaign (the PH-launch ask: "similar
 * plays across different products without rebuilding from scratch"). Deliberately no new
 * rows and no copying of channels/plans: the user tweaks the intake and the normal flow
 * re-researches everything fresh — a stale channel list would undercut the product's
 * whole live-research promise. RLS scopes the reads, so a foreign or garbage id just
 * renders the blank form.
 */
export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const user = await currentUser();

  let initial: IntakeValues | null = null;
  let sourceName: string | null = null;
  let recent: { id: string; name: string }[] = [];

  if (user) {
    const db = await createClient();
    // The picker lists finished campaigns only: an unfinished setup has no confirmed goal
    // worth copying, and its own resume card already lives on the home page.
    const { data: campaigns } = await db
      .from("campaigns")
      .select("id, name, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6);
    recent = (campaigns ?? []).map((c) => ({ id: c.id, name: c.name }));

    if (from) {
      const [{ data: campaign }, { data: goal }] = await Promise.all([
        db.from("campaigns").select("name, description").eq("id", from).maybeSingle(),
        db
          .from("goals")
          .select("objective, target_value, target_metric, timeframe")
          .eq("campaign_id", from)
          .maybeSingle(),
      ]);
      if (campaign) {
        initial = {
          name: campaign.name,
          description: campaign.description,
          rawGoal: goal
            ? goalSeed(
                goal as Pick<Goal, "objective" | "target_value" | "target_metric" | "timeframe">,
              )
            : "",
        };
        sourceName = campaign.name;
      }
    }
  }

  // Keyed by source: the picker navigates /new -> /new?from=X, and without a remount the
  // uncontrolled inputs would keep their old defaultValues and never show the seed.
  return <IntakeForm key={from ?? "blank"} initial={initial} sourceName={sourceName} recent={recent} />;
}
