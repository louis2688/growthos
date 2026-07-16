import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-4-8";

// Lazy so importing an agent module (e.g. in tests) never requires the API key.
export function anthropic() {
  return new Anthropic();
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
