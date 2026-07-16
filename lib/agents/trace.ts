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
        })
        .eq("id", runId);
    } catch {
      // A lost trace row is not worth failing the run over.
    }
  }

  try {
    const result = await fn();
    await finish("ok");
    return result;
  } catch (err) {
    await finish("failed", message(err));
    throw err;
  }
}
