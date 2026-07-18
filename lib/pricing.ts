/**
 * Cost estimation for agent runs.
 *
 * Deliberately NOT stored on the row: agent_runs records token counts, which are facts that
 * stay true, and the price is applied at read time. Writing a dollar amount into the row
 * would freeze today's rate into history and quietly need a backfill every time pricing
 * moves. The tradeoff is that old runs are costed at today's rate — fine for "what am I
 * spending", wrong for an invoice, which this isn't.
 */

import type { AgentRun } from "./types";

/** Published USD-per-million-token rates, by model string as stored on agent_runs.model. */
const RATES: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/**
 * Rate for a run's model. A null model is a pre-split row (all Opus back then), so it prices
 * as Opus. Any Cloudflare Workers AI model (@cf/…) is free tier — $0. An unrecognised Claude
 * model falls back to Opus rather than silently $0, so a new paid model can't read as free.
 */
function rateFor(model: string | null | undefined): { input: number; output: number } {
  if (model && RATES[model]) return RATES[model];
  if (model && model.startsWith("@cf/")) return { input: 0, output: 0 };
  return RATES["claude-opus-4-8"];
}

/**
 * Model tokens only, priced at the run's own model rate. Web searches are billed per request
 * and we have no verified per-search rate, so they are counted and shown separately rather
 * than folded in at a guessed price — a made-up number would understate spend while looking
 * authoritative. `model` defaults to Opus so a bare two-arg call still prices at Opus rates.
 */
export function estimateCostUsd(
  inputTokens: number,
  outputTokens: number,
  model: string | null = "claude-opus-4-8",
): number {
  const rate = rateFor(model);
  return (inputTokens / 1e6) * rate.input + (outputTokens / 1e6) * rate.output;
}

/** Sub-cent costs are real money at this volume; don't round them away to "$0.00". */
export function formatUsd(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/**
 * Only the runs that actually recorded usage. Runs traced before migration 0011, and runs
 * still in flight, have null tokens — that means "not measured", not "free". Coercing those
 * to 0 would produce a total that looks complete while omitting real spend, so callers must
 * report how many runs this dropped rather than presenting the sum as the whole bill.
 */
export function measured(runs: AgentRun[]): AgentRun[] {
  return runs.filter((r) => r.input_tokens != null);
}

export type Spend = { cost: number; tokens: number; searches: number };

/**
 * Spend across every run given, failures included — a run that died still burned tokens.
 * Priced PER RUN by that run's own model: a mixed set (Haiku + Cloudflare + historical Opus)
 * summed and priced once at a single rate would be wrong, so each run is costed on its own.
 */
export function spendOf(runs: AgentRun[]): Spend {
  const m = measured(runs);
  return {
    cost: m.reduce((s, r) => s + estimateCostUsd(r.input_tokens ?? 0, r.output_tokens ?? 0, r.model), 0),
    tokens: m.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0),
    searches: m.reduce((s, r) => s + (r.web_search_requests ?? 0), 0),
  };
}
