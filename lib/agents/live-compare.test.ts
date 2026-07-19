/**
 * Activation-gate comparison harness (task #70) — runs both research pipelines on the same
 * inputs and writes the results to /tmp/pipeline-compare.txt for human judgment. Makes REAL
 * paid API calls (~$0.08/input on the Haiku leg, Serper/Firecrawl credits on the cheap leg),
 * so it only runs when explicitly asked for:
 *
 *   RUN_LIVE_COMPARE=1 npx vitest run lib/agents/live-compare.test.ts
 *
 * First verdict (2026-07-20): Haiku won — better channel-type diversity, junk-free tails,
 * 4x faster. Cheap pipeline's tail was SEO-listicle blogs incl. one competitor. Iterate on
 * query templates before re-comparing.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cheapResearchChannels } from "./cheap-research";
import { researchChannelsHaiku, type ChannelResearchInput } from "./channel-research";

const LIVE = Boolean(process.env.RUN_LIVE_COMPARE);

if (LIVE && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) process.env[line.slice(0, eq).trim()] ??= line.slice(eq + 1).trim();
  }
}

const INPUTS: { label: string; input: ChannelResearchInput }[] = [
  {
    label: "habit tracker",
    input: {
      productName: "HabitFlow",
      productDescription:
        "A habit tracker app with streaks, gentle reminders, and weekly reflection prompts",
      goal: {
        objective: "Acquire active users for the habit tracker app",
        target_metric: "active users",
        target_value: "100",
        timeframe: "30 days",
        audience: "students and young professionals trying to build discipline and daily routines",
      },
    },
  },
  {
    label: "freelancer bookkeeping",
    input: {
      productName: "LedgerLite",
      productDescription: "Simple bookkeeping for freelancers who hate spreadsheets and tax season",
      goal: {
        objective: "Get paying subscribers",
        target_metric: "subscribers",
        target_value: "50",
        timeframe: "60 days",
        audience: "freelance designers and developers in the US who invoice clients directly",
      },
    },
  },
];

describe.skipIf(!LIVE)("pipeline comparison (live, manual gate)", () => {
  for (const { label, input } of INPUTS) {
    it(
      `cheap pipeline: ${label}`,
      { timeout: 180_000 },
      async () => {
        const t0 = Date.now();
        const result = await cheapResearchChannels(input);
        appendFileSync(
          "/tmp/pipeline-compare.txt",
          `\n===== CHEAP [${label}] ${((Date.now() - t0) / 1000).toFixed(1)}s =====\n` +
            JSON.stringify(result.channels, null, 1) + "\n",
        );
        expect(result.channels.length).toBeGreaterThanOrEqual(4);
      },
    );
    it(
      `haiku pipeline: ${label}`,
      { timeout: 280_000 },
      async () => {
        const t0 = Date.now();
        const result = await researchChannelsHaiku(input);
        appendFileSync(
          "/tmp/pipeline-compare.txt",
          `\n===== HAIKU [${label}] ${((Date.now() - t0) / 1000).toFixed(1)}s =====\n` +
            JSON.stringify(result.channels, null, 1) + "\n",
        );
        expect(result.channels.length).toBeGreaterThanOrEqual(4);
      },
    );
  }
});
