import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { HAIKU, anthropic, deadlineSignal, oneLine, recordUsage } from "./run";

export const CompetitorScanSchema = z.object({
  summary: z
    .string()
    .describe(
      "One paragraph: the state of play for this audience on this channel right now. " +
        "If nothing verifiable turned up, say that plainly instead of padding.",
    ),
  competitors: z
    .array(
      z.object({
        name: z.string().describe("The competing product or company, as it names itself."),
        what: z.string().describe("What it does, ONE line."),
        presence: z
          .string()
          .describe("What it is verifiably doing on or around this channel — posts, launches, ads."),
        source_url: z
          .string()
          .describe("The URL where this was seen, from search results. Empty string if none."),
      }),
    )
    .max(5)
    .describe("Verified competitors only. An empty list with an honest summary beats a padded one."),
  takeaways: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("What this campaign should do differently on this channel, given the landscape."),
});

export type CompetitorScan = z.infer<typeof CompetitorScanSchema>;

export type CompetitorScanInput = {
  productName: string;
  productDescription: string;
  goal: { objective: string; audience: string };
  channel: { name: string; platform: string; type: string };
  plan: { title: string; objective: string };
  todo: { title: string; description: string };
};

function buildPrompt(input: CompetitorScanInput): string {
  return `You are a competitive researcher. Snapshot who is competing for this audience on this channel, right now.

Product: ${input.productName}
What it does: ${input.productDescription}
Goal: ${input.goal.objective}
Audience: ${input.goal.audience}

Channel: ${input.channel.name} on ${input.channel.platform} (a ${input.channel.type} channel)
Plan: ${input.plan.title} — ${input.plan.objective}
This specific task: ${input.todo.title} — ${input.todo.description}

Use web search to find products competing for this same audience and what they are actually
doing on or around this channel — recent posts, launches, ads, community activity.

Rules:
- Only name competitors you actually found in search results, with the URL you saw them at.
  NEVER pad the list from memory — training-data recall is how dead products and invented
  rivals end up in the artifact. Fewer verified entries beat five stale ones.
- Never invent traffic numbers, follower counts, funding, or revenue. If a source states a
  number, attribute it ("their PH launch page shows...").
- "Presence" means evidence on or near THIS channel. A competitor that exists but shows no
  footprint here is worth listing only if you say exactly that.
- If searching turns up nothing verifiable, say so in the summary and give takeaways for
  entering a quiet channel — an honest empty scan is a valid result.
- Takeaways are for THIS campaign: positioning angles, gaps worth filling, mistakes to avoid.
- This is a one-time snapshot. Nothing here keeps watching after you answer.`;
}

// web_search_20250305, not the _20260209 variant: Haiku only supports the older tool version
// (same constraint as launch-timing and channel-research).
const tools = [{ type: "web_search_20250305" as const, name: "web_search" as const, max_uses: 4 }];

export async function scanCompetitors(input: CompetitorScanInput): Promise<CompetitorScan> {
  // Not wrapped in withRetry: a retry re-runs every paid web search, and runTodoTool already
  // surfaces a retry to the user (same reasoning as recommendTiming).
  const client = anthropic();
  const signal = deadlineSignal();
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: buildPrompt(input) }];

  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await client.messages.parse(
      {
        // Haiku: no adaptive thinking, no effort param (both 400 on this model).
        model: HAIKU,
        max_tokens: 4000,
        tools,
        output_config: { format: zodOutputFormat(CompetitorScanSchema) },
        messages,
      },
      { signal },
    );
    // Before the pause check, not after: a paused turn is billed like any other.
    recordUsage(response.usage);

    if (response.stop_reason === "pause_turn") {
      messages = [...messages, { role: "assistant", content: response.content }];
      continue;
    }
    if (!response.parsed_output) throw new Error("Model returned no parsable competitor scan");
    // An artifact whose headline paragraph is blank is noise, whatever the list holds.
    if (!response.parsed_output.summary.trim()) {
      throw new Error("Model returned an empty scan summary");
    }
    return response.parsed_output;
  }
  throw new Error("Competitor scan did not complete after repeated pauses");
}

export function formatCompetitorScan(scan: CompetitorScan): string {
  const parts = [scan.summary.trim()];
  if (scan.competitors.length > 0) {
    parts.push(
      scan.competitors
        .map((c) => {
          // oneLine on the header: a control character here breaks the artifact's list line.
          const head = `- ${oneLine(c.name)} — ${oneLine(c.what)}`;
          const src = c.source_url.trim() ? `\n  Seen at: ${c.source_url.trim()}` : "";
          return `${head}\n  ${c.presence.trim()}${src}`;
        })
        .join("\n"),
    );
  }
  parts.push(`---\nWhat to do with this:\n${scan.takeaways.map((t) => `- ${t}`).join("\n")}`);
  parts.push(
    "Snapshot from a live search just now — GrowthOS doesn't keep monitoring. Re-run for a fresh look.",
  );
  return parts.join("\n\n");
}
