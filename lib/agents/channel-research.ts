import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { HAIKU, anthropic, deadlineSignal, recordUsage } from "./run";
import type { GoalAnalysis } from "./goal-analyzer";

export const ChannelResearchSchema = z.object({
  channels: z
    .array(
      z.object({
        name: z.string().describe("Specific place, e.g. 'r/personalfinance', not 'Reddit'"),
        platform: z.string().describe("Host platform, e.g. 'Reddit', 'Product Hunt', 'Independent'"),
        type: z
          .string()
          .describe("community | directory | publication | influencer | platform | other"),
        reason: z.string().describe("1-2 sentences: why this audience lives here"),
        confidence: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(4)
    .max(12),
});

export type ChannelResearch = z.infer<typeof ChannelResearchSchema>;

export type ChannelResearchInput = {
  productName: string;
  productDescription: string;
  goal: Pick<GoalAnalysis, "objective" | "target_metric" | "target_value" | "timeframe" | "audience">;
};

function buildPrompt(input: ChannelResearchInput): string {
  return `You are a growth channel researcher. Find the best specific places to reach this audience.

Product: ${input.productName}
What it does: ${input.productDescription}
Objective: ${input.goal.objective} — ${input.goal.target_value} ${input.goal.target_metric} in ${input.goal.timeframe || "an unspecified timeframe"}
Audience: ${input.goal.audience}

Use web search to find and verify SPECIFIC, currently-active channels: named subreddits,
named communities, directories, newsletters, publications, or influencer niches — not
platform categories. "r/personalfinance" is a channel; "Reddit" is not.

Return 6-10 channels. For each: where it is, what kind of place it is, why this exact
audience is reachable there, and your confidence. Prefer channels you verified exist via
search; if search fails you, you may fall back to well-known channels from your own
knowledge but mark those confidence "low".`;
}

// 6 searches put a real run at 252s against Vercel's 300s ceiling. 4 still comfortably
// covers "find and verify 6-10 channels" and buys back headroom.
// web_search_20250305, not _20260209: Haiku only supports the older tool variant (verified).
const tools = [{ type: "web_search_20250305" as const, name: "web_search" as const, max_uses: 4 }];

export async function researchChannels(
  input: ChannelResearchInput,
  // deadlineMs: callers that run ANOTHER agent in the same function invocation (the homepage
  // preview chains goal analysis first) must pass their REMAINING budget — the default 240s
  // assumes this agent has the whole 300s function to itself, and a fresh 240s started after a
  // slow analysis phase would let Vercel kill the function before our own catch fires.
  opts: { deadlineMs?: number } = {},
): Promise<ChannelResearch> {
  // Deliberately NOT wrapped in withRetry: this agent runs several web searches, and a
  // retry re-runs the whole conversation from scratch — the most expensive call in the app,
  // charged twice. Its callers already catch and surface a user-facing retry, so an internal
  // retry just doubles cost for a rare malformed-output case.
  const client = anthropic();
  // One deadline across the whole pause/resume loop, not per request — the loop is what
  // runs long, and being killed by the platform mid-loop is the failure we're avoiding.
  const signal = deadlineSignal(opts.deadlineMs);
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: buildPrompt(input) }];

  // Server-side web search can pause long turns; resume by echoing content back.
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await client.messages.parse(
      {
        // Haiku: no adaptive thinking / effort (both 400). Runs without thinking, over
        // searched facts — the reasoning that matters here is verifying channels via search.
        model: HAIKU,
        max_tokens: 8192,
        tools,
        output_config: { format: zodOutputFormat(ChannelResearchSchema) },
        messages,
      },
      { signal },
    );
    // Before the pause check, not after: web search pauses this turn repeatedly, and every
    // paused response is billed. Recording only the final one would report the app's most
    // expensive agent as its cheapest.
    recordUsage(response.usage);

    if (response.stop_reason === "pause_turn") {
      messages = [...messages, { role: "assistant", content: response.content }];
      continue;
    }
    if (!response.parsed_output) throw new Error("Model returned no parsable channel research");
    return response.parsed_output;
  }
  throw new Error("Channel research did not complete after repeated pauses");
}
