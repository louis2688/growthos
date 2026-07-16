import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODEL, anthropic, deadlineSignal, oneLine } from "./run";

export const LaunchTimingSchema = z.object({
  window: z
    .string()
    .describe(
      "The posting window on ONE line, day then clock range, e.g. 'Tuesday 08:00-10:00' or " +
        "'Tue-Thu 09:00-11:00'. No line breaks. Both ends must be real times.",
    ),
  timezone: z.string().describe("Timezone the window is expressed in, e.g. 'US Eastern'"),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z
    .string()
    .describe("Why this window, tied to THIS channel's audience. Say if it's a general heuristic."),
  checklist: z
    .array(z.string())
    .min(2)
    .max(6)
    .describe("What to have ready before posting, and what to do in the first hour after."),
});

export type LaunchTiming = z.infer<typeof LaunchTimingSchema>;

export type LaunchTimingInput = {
  productName: string;
  goal: { objective: string; audience: string };
  channel: { name: string; platform: string; type: string };
  plan: { title: string; objective: string };
  todo: { title: string; description: string };
};

function buildPrompt(input: LaunchTimingInput): string {
  return `You are a launch advisor. Recommend WHEN to post this, and nothing else.

Product: ${input.productName}
Goal: ${input.goal.objective}
Audience: ${input.goal.audience}

Channel: ${input.channel.name} on ${input.channel.platform} (a ${input.channel.type} channel)
Plan: ${input.plan.title} — ${input.plan.objective}
This specific task: ${input.todo.title} — ${input.todo.description}

Use web search to check how this channel actually behaves — its peak activity, any rules about
timing, and (for launch directories) how their ranking window works. Prefer what you can verify.

Rules:
- You ADVISE. You cannot schedule, publish, or post anything, and nothing downstream will do it
  for you. Never imply the post will go out automatically — the reader does it by hand.
- Tie the window to where this audience actually is. Say the timezone explicitly.
- If you could not verify current behaviour and are falling back on a general heuristic, say so
  plainly in your reasoning and set confidence 'low'. A confident guess is worse than an
  admitted one.
- Never invent traffic statistics, member counts, or "best time" numbers you didn't verify.
- The checklist is what to have ready beforehand and what to do in the first hour after posting.`;
}

const tools = [{ type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 4 }];

export async function recommendTiming(input: LaunchTimingInput): Promise<LaunchTiming> {
  // Not wrapped in withRetry: same reasoning as researchChannels — a retry re-runs every
  // web search from scratch, and runTodoTool already surfaces a retry to the user.
  const client = anthropic();
  const signal = deadlineSignal();
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: buildPrompt(input) }];

  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await client.messages.parse(
      {
        model: MODEL,
        max_tokens: 4000,
        thinking: { type: "adaptive" },
        tools,
        output_config: { format: zodOutputFormat(LaunchTimingSchema) },
        messages,
      },
      { signal },
    );

    if (response.stop_reason === "pause_turn") {
      messages = [...messages, { role: "assistant", content: response.content }];
      continue;
    }
    if (!response.parsed_output) throw new Error("Model returned no parsable launch timing");
    // Matches the other agents' empty-content guard: a blank window would ship an artifact
    // whose entire point — the headline — is missing.
    if (!response.parsed_output.window.trim()) {
      throw new Error("Model returned an empty timing window");
    }
    return response.parsed_output;
  }
  throw new Error("Launch timing did not complete after repeated pauses");
}

export function formatTiming(timing: LaunchTiming): string {
  return [
    // oneLine, not trim: a model emitted a literal \r inside window, which reached the
    // artifact's headline as a broken line.
    `Post: ${oneLine(timing.window)} (${oneLine(timing.timezone)})`,
    `Confidence: ${timing.confidence}`,
    timing.reasoning.trim(),
    `---\nBefore and after posting:\n${timing.checklist.map((c) => `- ${c}`).join("\n")}`,
    `You post this yourself — GrowthOS doesn't publish anything.`,
  ].join("\n\n");
}
