import { newUsage, withUsage } from "./run";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

export type TraceContext = {
  agent: string;
  campaign_id: string;
  todo_id?: string | null;
};

function message(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Records one agent call to agent_runs: how long it took, whether it worked, and why not.
 *
 * Observability must never be the thing that breaks the app. Every write here is
 * best-effort — if the trace insert fails, the agent call still runs and its result (or
 * its error) still propagates untouched. That's the opposite of the campaignMilestones
 * rule, where a swallowed read became a lie to the user; here a lost trace row costs us
 * a debugging breadcrumb and nothing else.
 */
export async function traced<T>(db: Db, ctx: TraceContext, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  // Accumulates across every API call the agent makes, including the paused turns in
  // channel research's pause/resume loop.
  const usage = newUsage();

  let runId: string | undefined;
  try {
    const { data } = await db
      .from("agent_runs")
      .insert({
        campaign_id: ctx.campaign_id,
        todo_id: ctx.todo_id ?? null,
        agent: ctx.agent,
        status: "running",
      })
      .select("id")
      .single();
    runId = data?.id as string | undefined;
  } catch {
    // Couldn't open the trace — the run itself still goes ahead untraced.
  }

  async function finish(status: "ok" | "failed", error?: string) {
    if (!runId) return;
    try {
      await db
        .from("agent_runs")
        .update({
          status,
          error: error?.slice(0, 2000) ?? null,
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          web_search_requests: usage.web_search_requests,
        })
        .eq("id", runId);
    } catch {
      // A lost trace row is not worth failing the run over.
    }
  }

  try {
    const result = await withUsage(usage, fn);
    await finish("ok");
    return result;
  } catch (err) {
    // Usage is written on this path too: a run that dies at the 240s deadline still burned
    // every token and paid search it made up to that point. Recording spend only for runs
    // that succeeded would hide the most expensive failures in the app.
    await finish("failed", message(err));
    throw err;
  }
}
