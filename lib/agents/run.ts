import { AsyncLocalStorage } from "node:async_hooks";
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-4-8";

/**
 * Cheaper Claude tier for the two agents that need web search but not frontier reasoning
 * (channel research, launch timing). Verified live to support web_search + structured output
 * together. Note: Haiku does NOT support adaptive thinking or the effort param (both 400), and
 * gets the older web_search_20250305 tool variant — callers must account for both.
 */
export const HAIKU = "claude-haiku-4-5";

// Lazy so importing an agent module (e.g. in tests) never requires the API key.
export function anthropic() {
  return new Anthropic();
}

/** What one agent run spent. Searches are counted, not priced — see lib/pricing.ts. */
export type AgentUsage = {
  input_tokens: number;
  output_tokens: number;
  web_search_requests: number;
  /**
   * Set by agents whose model is decided at RUNTIME (the research facade picks cheap-pipeline
   * vs Haiku per run). traced() writes it over the static MODEL_BY_AGENT stamp, so the row
   * prices by the model that actually served the run — otherwise free Cloudflare synthesis
   * tokens would be billed at Haiku rates on the Activity page.
   */
  model?: string;
};

export function newUsage(): AgentUsage {
  return { input_tokens: 0, output_tokens: 0, web_search_requests: 0 };
}

/**
 * Per-run usage accumulator.
 *
 * AsyncLocalStorage rather than a module-level counter because suggestToolsForPlan fans out
 * one tool_recommender call per plan concurrently — a shared counter would bill every plan's
 * tokens to whichever run happened to finish last. Each traced() scope gets its own.
 */
const usageStore = new AsyncLocalStorage<AgentUsage>();

export function withUsage<T>(usage: AgentUsage, fn: () => Promise<T>): Promise<T> {
  return usageStore.run(usage, fn);
}

/**
 * Adds one API response to the enclosing withUsage() scope; a no-op outside one, so agents
 * called directly from tests and evals still work untracked.
 *
 * Call this for EVERY response, including the paused ones inside a pause_turn loop — a
 * paused turn is billed like any other, so recording only the final one would undercount
 * channel research (up to 5 billed calls) by most of its actual spend.
 *
 * Structural param: the SDK's Usage isn't exported at the top level, and Anthropic.Usage
 * satisfies this shape.
 *
 * ponytail: we never set cache_control, so usage.cache_* is always null and input_tokens is
 * the whole input. Add prompt caching and this needs the discounted read/write rates too.
 */
export function recordUsage(usage: {
  input_tokens: number;
  output_tokens: number;
  server_tool_use?: { web_search_requests: number } | null;
}): void {
  const acc = usageStore.getStore();
  if (!acc) return;
  acc.input_tokens += usage.input_tokens;
  acc.output_tokens += usage.output_tokens;
  acc.web_search_requests += usage.server_tool_use?.web_search_requests ?? 0;
}

/** Stamps which model served this run; last writer wins, so a fallback relabels the row. */
export function recordModel(model: string): void {
  const acc = usageStore.getStore();
  if (acc) acc.model = model;
}

/**
 * Collapses control characters and runs of whitespace into single spaces.
 *
 * For short single-line fields that get rendered as a header. Models occasionally emit a
 * stray \r or newline mid-value; the artifact is shown verbatim in a whitespace-pre-wrap
 * block, so it would reach the user as a broken line. The agents that use web search
 * deliberately don't retry (a retry re-runs every paid search), so a schema regex would
 * hard-fail the run instead of cleaning it up — normalise here rather than reject.
 */
export function oneLine(value: string): string {
  // Control characters (including the stray \r a model emitted mid-value) become
  // spaces, then every whitespace run collapses to one.
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Vercel kills the function at maxDuration=300 with no catch, no error page and no saved
 * work — the user just loses a paid run. Channel research has been observed at 252s, so the
 * headroom is thin. Fail our own way at 240s instead: the action's catch runs, the trace
 * records why, and the user gets the normal retry message.
 */
export const AGENT_DEADLINE_MS = 240_000;

export function deadlineSignal(ms: number = AGENT_DEADLINE_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

/**
 * Retry contract shared by all agents: API errors (auth, rate limit, overload)
 * already get SDK-level retries and are re-thrown; anything else is treated as
 * malformed model output and retried exactly once.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Anthropic.APIError) throw err;
    return await fn();
  }
}
