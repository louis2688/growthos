import { describe, expect, it } from "vitest";
import { estimateCostUsd, formatUsd, measured, spendOf } from "./pricing";
import type { AgentRun } from "./types";

function run(over: Partial<AgentRun>): AgentRun {
  return {
    id: "r1",
    campaign_id: "c1",
    todo_id: null,
    agent: "post_writer",
    status: "ok",
    started_at: "2026-07-17T00:00:00Z",
    finished_at: "2026-07-17T00:00:10Z",
    duration_ms: 10_000,
    error: null,
    created_at: "2026-07-17T00:00:00Z",
    input_tokens: 1000,
    output_tokens: 1000,
    web_search_requests: 0,
    model: "claude-opus-4-8",
    ...over,
  };
}

describe("estimateCostUsd", () => {
  it("prices input and output at their different published rates", () => {
    // 1M in at $5 + 1M out at $25. Output is 5x input; a single blended rate would be wrong.
    expect(estimateCostUsd(1_000_000, 1_000_000)).toBeCloseTo(30, 6);
    expect(estimateCostUsd(1_000_000, 0)).toBeCloseTo(5, 6);
    expect(estimateCostUsd(0, 1_000_000)).toBeCloseTo(25, 6);
  });

  it("prices per model — Haiku at its own rate, not Opus's", () => {
    // Haiku is $1/$5, a fifth of Opus. Pricing a Haiku run at Opus rates would 5x the bill.
    expect(estimateCostUsd(1_000_000, 1_000_000, "claude-haiku-4-5")).toBeCloseTo(6, 6);
  });

  it("prices any Cloudflare Workers AI model at $0 (free tier)", () => {
    expect(estimateCostUsd(1_000_000, 1_000_000, "@cf/meta/llama-3.3-70b-instruct-fp8-fast")).toBe(0);
  });

  it("treats a null model (pre-split row) as Opus, and an unknown Claude model as Opus too", () => {
    // Null must not read as free — those historical rows genuinely ran on Opus.
    expect(estimateCostUsd(1_000_000, 0, null)).toBeCloseTo(5, 6);
    // A future paid Claude model we haven't mapped must not silently price as $0.
    expect(estimateCostUsd(1_000_000, 0, "claude-something-new")).toBeCloseTo(5, 6);
  });

  it("is zero for a run that spent nothing", () => {
    expect(estimateCostUsd(0, 0)).toBe(0);
  });
});

describe("formatUsd", () => {
  it("never rounds real spend down to $0.00", () => {
    // A few thousand tokens is a fraction of a cent but is not free; "$0.00" would read as
    // "this cost nothing".
    expect(formatUsd(0.004)).toBe("<$0.01");
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(1.239)).toBe("$1.24");
  });
});

describe("measured", () => {
  /**
   * The load-bearing test for the whole feature. The Activity page derives its "N earlier
   * runs not counted" caveat from runs.length - measured(runs).length; if this ever returns
   * unmeasured rows, that caveat silently reads 0 and a partial total is presented as the
   * complete bill. Verified by negative control: making this `return runs` fails here and
   * nowhere else, because ?? 0 hides the same bug everywhere downstream.
   */
  it("drops unmeasured runs rather than counting them as free", () => {
    const runs = [run({}), run({ id: "r2", input_tokens: null, output_tokens: null })];
    expect(measured(runs)).toHaveLength(1);
  });

  it("keeps the count of what it dropped recoverable, so the UI can disclose it", () => {
    const runs = [
      run({}),
      run({ id: "r2", input_tokens: null, output_tokens: null }),
      run({ id: "r3", input_tokens: null, output_tokens: null }),
    ];
    expect(runs.length - measured(runs).length).toBe(2);
  });
});

describe("spendOf", () => {
  it("contributes nothing for an unmeasured row instead of producing NaN", () => {
    const runs = [
      run({ input_tokens: 1_000_000, output_tokens: 1_000_000 }),
      run({ id: "r2", input_tokens: null, output_tokens: null, web_search_requests: null }),
    ];
    const s = spendOf(runs);
    expect(s.cost).toBeCloseTo(30, 6);
    expect(s.tokens).toBe(2_000_000);
  });

  it("counts failed runs — a run that died still burned its tokens", () => {
    const runs = [
      run({ status: "failed", error: "timeout", input_tokens: 1_000_000, output_tokens: 0 }),
    ];
    expect(spendOf(runs).cost).toBeCloseTo(5, 6);
  });

  it("prices a mixed-model set per run, not summed-then-priced-once", () => {
    // Opus (1M/0 = $5) + Haiku (1M/0 = $1) + Cloudflare (free = $0) = $6. Summing the tokens
    // first (2M in) and pricing at one rate would give the wrong number for every model.
    const runs = [
      run({ model: "claude-opus-4-8", input_tokens: 1_000_000, output_tokens: 0 }),
      run({ id: "r2", model: "claude-haiku-4-5", input_tokens: 1_000_000, output_tokens: 0 }),
      run({ id: "r3", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", input_tokens: 1_000_000, output_tokens: 0 }),
    ];
    expect(spendOf(runs).cost).toBeCloseTo(6, 6);
    expect(spendOf(runs).tokens).toBe(3_000_000);
  });

  it("counts web searches separately and keeps them out of the cost", () => {
    // Searches are billed per request at a rate we don't have; the cost must reflect tokens
    // only, and never quietly absorb a made-up per-search price.
    const s = spendOf([run({ input_tokens: 0, output_tokens: 0, web_search_requests: 4 })]);
    expect(s.searches).toBe(4);
    expect(s.cost).toBe(0);
  });

  it("is zero-but-honest when nothing is measured", () => {
    const s = spendOf([run({ input_tokens: null, output_tokens: null })]);
    expect(s.cost).toBe(0);
    expect(s.tokens).toBe(0);
  });
});
