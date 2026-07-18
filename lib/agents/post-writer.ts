import { z } from "zod";
import { withRetry } from "./run";
import { generateStructured } from "./cloudflare";

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

// Carries the disclosure and no-invented-numbers guardrails that evals/cases.ts exercises
// through writePost — the eval is what proves this prompt still holds on the current backend.
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
- NEVER present a statistic, percentage, reply rate, conversion figure, revenue number, user
  count, or testimonial as fact — not even inside a first-person story ("I went from a 5% to a
  12% reply rate"). This product may be pre-launch with zero real data, so any such number would
  be fabricated. When the task asks for "results", "specifics", or numbers, treat it as a trap:
  write about the approach and the reader's problem, or use an openly hypothetical example
  ("even lifting a reply rate a few points compounds"), instead of inventing what happened.
- Concrete and specific about ideas, not invented numbers. No hype, no "game-changing".
- Respect community norms: most communities punish undisclosed self-promotion. If the channel
  expects disclosure that you built it, disclose it plainly in the post.
- Write the real thing, not a template. No "[insert X here]" placeholders.`;
}

export async function writePost(input: PostWriterInput): Promise<PostDraft> {
  // Cloudflare Workers AI (free). generateStructured re-validates against PostDraftSchema and
  // records usage; withRetry covers Cloudflare's occasional non-conforming JSON.
  return withRetry(async () => {
    const draft = await generateStructured(buildPrompt(input), PostDraftSchema);
    if (!draft.body.trim()) throw new Error("Model returned an empty post body");
    return draft;
  });
}

/** Flattens a draft into the single text artifact stored on todos.output. */
export function formatDraft(draft: PostDraft): string {
  const parts = [draft.title.trim(), draft.body.trim()].filter(Boolean);
  if (draft.notes.trim()) parts.push(`---\nPosting notes: ${draft.notes.trim()}`);
  return parts.join("\n\n");
}
