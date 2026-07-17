import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODEL, anthropic, recordUsage, withRetry } from "./run";

export const PostDraftSchema = z.object({
  title: z
    .string()
    .describe("Headline/subject line. Empty string if this channel's posts have no title."),
  body: z.string().describe("The full post, ready to paste. Plain text, in the channel's voice."),
  notes: z
    .string()
    .describe("Short posting guidance: timing, rule compliance, what to do in the comments."),
});

export type PostDraft = z.infer<typeof PostDraftSchema>;

export type PostWriterInput = {
  productName: string;
  productDescription: string;
  goal: { objective: string; audience: string };
  channel: { name: string; platform: string; type: string };
  plan: { title: string; objective: string };
  todo: { title: string; description: string };
};

function buildPrompt(input: PostWriterInput): string {
  return `You are a growth copywriter. Write ONE post, ready to publish as-is.

Product: ${input.productName}
What it does: ${input.productDescription}
Goal: ${input.goal.objective}
Audience: ${input.goal.audience}

Where it posts: ${input.channel.name} on ${input.channel.platform} (a ${input.channel.type} channel)
Plan: ${input.plan.title} — ${input.plan.objective}
This specific task: ${input.todo.title} — ${input.todo.description}

Write in the native voice of ${input.channel.name}. Match what actually performs there: an
educational or value-first post for a community, a launch post for a directory, a
build-in-public update for a founder audience. Infer the right register from the channel and
the task above — do not use a generic marketing voice anywhere.

Rules:
- Lead with something useful to the reader. The product earns its mention by being relevant,
  never by being the point of the post.
- Concrete and specific. No hype, no "game-changing", no invented statistics, testimonials, or
  user counts — you do not know them.
- Respect community norms: most communities punish undisclosed self-promotion. If the channel
  expects disclosure that you built it, disclose it plainly in the post.
- Write the real thing, not a template. No "[insert X here]" placeholders.`;
}

export async function writePost(input: PostWriterInput): Promise<PostDraft> {
  return withRetry(async () => {
    const response = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(PostDraftSchema) },
      messages: [{ role: "user", content: buildPrompt(input) }],
    });
    recordUsage(response.usage);
    if (!response.parsed_output) throw new Error("Model returned no parsable post draft");
    if (!response.parsed_output.body.trim()) throw new Error("Model returned an empty post body");
    return response.parsed_output;
  });
}

/** Flattens a draft into the single text artifact stored on todos.output. */
export function formatDraft(draft: PostDraft): string {
  const parts = [draft.title.trim(), draft.body.trim()].filter(Boolean);
  if (draft.notes.trim()) parts.push(`---\nPosting notes: ${draft.notes.trim()}`);
  return parts.join("\n\n");
}
