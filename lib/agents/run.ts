import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-4-8";

// Lazy so importing an agent module (e.g. in tests) never requires the API key.
export function anthropic() {
  return new Anthropic();
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
