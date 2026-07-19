import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { ToolHandler } from "@/lib/types";

/**
 * Monthly AI credit wallet — the agreed pricing model (task #57): campaigns are containers,
 * GENERATION is the metered unit, and every AI call deducts from one shared pool. Prices are
 * proportional to real cost measured from agent_runs: campaign generation carries the live
 * web-search bill (~$0.08), Cloudflare-backed tools are free per call but drain the shared
 * daily neuron pool. utm_builder is deliberately 0 — it is pure code, no AI at all.
 */
export const CREDIT_COSTS = {
  post_writer: 1,
  seo_optimizer: 1,
  email_digest: 1,
  utm_builder: 0,
  launch_timing: 5,
  image_generator: 2,
} as const satisfies Record<ToolHandler, number>;

export const GENERATION_COST = 10; // channel research + plan generation, charged at confirmGoal
export const REGENERATE_COST = 2; // reuses researched channels — Cloudflare only

/**
 * Everyone gets the paid-tier-sized allowance during free early access — generous enough that
 * the existing daily caps bite first, so early birds never feel this. Tier mapping (Indie 50 /
 * Growth 500) arrives with billing (#56); it's a code-side constant so that flip is trivial.
 */
export const MONTHLY_ALLOWANCE = 500;

const currentMonth = () => new Date().toISOString().slice(0, 7);

/**
 * Charge-on-attempt, before the AI call, same posture as the daily quotas: a failed run still
 * burned tokens, so refunds would make a flaky upstream unmetered. Throws on limiter failure —
 * callers fail closed.
 */
export async function spendCredits(
  userId: string,
  cost: number,
): Promise<{ ok: true; remaining: number } | { ok: false }> {
  if (cost === 0) return { ok: true, remaining: Infinity };
  const { data, error } = await createServiceClient().rpc("spend_credits", {
    p_user_id: userId,
    p_month: currentMonth(),
    p_cost: cost,
    p_allowance: MONTHLY_ALLOWANCE,
  });
  if (error) throw new Error(`Credit check failed: ${error.message}`);
  return data === -1 ? { ok: false } : { ok: true, remaining: data as number };
}

/** For the settings meter. Missing row = nothing spent this month. */
export async function creditStatus(
  userId: string,
): Promise<{ spent: number; allowance: number }> {
  const { data, error } = await createServiceClient()
    .from("credit_usage")
    .select("spent")
    .eq("user_id", userId)
    .eq("month", currentMonth())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { spent: data?.spent ?? 0, allowance: MONTHLY_ALLOWANCE };
}

