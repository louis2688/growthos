import { describe, expect, it } from "vitest";
import { normalizeUsage } from "./post-writer-mastra";

/**
 * Guards the seam between Mastra's usage shape and agent_runs. Every case here is a way the
 * Activity page could end up reporting a confident wrong number.
 */
describe("normalizeUsage", () => {
  it("maps Mastra's flat AI-SDK shape to the columns agent_runs stores", () => {
    // The shape confirmed against a live @mastra/core@1.51 response.
    expect(normalizeUsage({ inputTokens: 834, outputTokens: 826 })).toEqual({
      input_tokens: 834,
      output_tokens: 826,
    });
  });

  it("refuses the nested shape instead of coercing an object into a token count", () => {
    // This is the shape Mastra nests under usage.raw for V3 models. If it ever surfaces at
    // the top level, recording it would write garbage; unmeasured is the honest answer.
    const nested = { inputTokens: { total: 834, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 826 } };
    expect(normalizeUsage(nested)).toBeNull();
  });

  it("returns null when the provider reported no usage", () => {
    expect(normalizeUsage(undefined)).toBeNull();
    expect(normalizeUsage(null)).toBeNull();
    expect(normalizeUsage({})).toBeNull();
  });

  it("returns null on a half-reported usage rather than billing the missing half as free", () => {
    expect(normalizeUsage({ inputTokens: 834 })).toBeNull();
    expect(normalizeUsage({ outputTokens: 826 })).toBeNull();
  });

  it("keeps a genuine zero, which is not the same as missing", () => {
    expect(normalizeUsage({ inputTokens: 0, outputTokens: 0 })).toEqual({
      input_tokens: 0,
      output_tokens: 0,
    });
  });
});
