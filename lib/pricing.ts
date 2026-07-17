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

/** Anthropic's published rates for MODEL (claude-opus-4-8), USD per million tokens. */
const INPUT_USD_PER_MTOK = 5;
const OUTPUT_USD_PER_MTOK = 25;

/**
 * Model tokens only. Web searches are billed per request and we have no verified per-search
 * rate, so they are counted and shown separately rather than folded in at a guessed price —
 * a made-up number here would understate real spend while looking authoritative.
 */
export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1e6) * INPUT_USD_PER_MTOK + (outputTokens / 1e6) * OUTPUT_USD_PER_MTOK;
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

/** Spend across every run given, failures included — a run that died still burned tokens. */
export function spendOf(runs: AgentRun[]): Spend {
  const m = measured(runs);
  const input = m.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
  const output = m.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
  return {
    cost: estimateCostUsd(input, output),
    tokens: input + output,
    searches: m.reduce((s, r) => s + (r.web_search_requests ?? 0), 0),
  };
}
