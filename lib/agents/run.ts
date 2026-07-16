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
