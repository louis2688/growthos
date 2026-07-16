import { createClient } from "@/lib/supabase/server";
import type { AgentRun, Campaign } from "@/lib/types";
import Activity from "./activity";

export const dynamic = "force-dynamic";

/** Enough history to be useful without paginating; the table is tiny per user. */
const RUN_LIMIT = 200;

export default async function ActivityPage() {
  const db = await createClient();
  // RLS scopes agent_runs through the campaign, so this is already only the caller's runs.
  // throwOnError: a failed read must not render as "no activity yet".
  const [{ data: runs }, { data: campaigns }] = await Promise.all([
    db
      .from("agent_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(RUN_LIMIT)
      .throwOnError(),
    db.from("campaigns").select("id, name").throwOnError(),
  ]);

  const campaignName = new Map(
    ((campaigns ?? []) as Pick<Campaign, "id" | "name">[]).map((c) => [c.id, c.name]),
  );

  return <Activity runs={(runs ?? []) as AgentRun[]} campaignName={Object.fromEntries(campaignName)} />;
}
