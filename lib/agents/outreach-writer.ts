import { z } from "zod";
import { withRetry } from "./run";
import { generateStructured } from "./cloudflare";
import { voiceSection, type BrandVoice } from "./brand-voice";

export const OutreachDraftSchema = z.object({
  who: z
    .string()
    .describe(
      "Who to reach out to on this channel and where to find them — a profile of the warm lead, " +
        "not a list of names.",
    ),
  subject: z
    .string()
    .describe("Subject or opening line. Empty string if this channel's DMs have no subject."),
  message: z
    .string()
    .describe(
      "The outreach message, short and specific. Personal details the sender must fill go in " +
        "[square brackets] — at most two such slots.",
    ),
  notes: z
    .string()
    .describe("Etiquette for this channel: disclosure, DM norms, when to use a public reply instead."),
});

export type OutreachDraft = z.infer<typeof OutreachDraftSchema>;

export type OutreachWriterInput = {
  productName: string;
  productDescription: string;
  goal: { objective: string; audience: string };
  channel: { name: string; platform: string; type: string };
  plan: { title: string; objective: string };
  todo: { title: string; description: string };
  voice?: BrandVoice | null;
};

function buildPrompt(input: OutreachWriterInput): string {
  return `You are an outreach writer. Draft ONE message a founder will personalize and send by hand.

Product: ${input.productName}
What it does: ${input.productDescription}
Goal: ${input.goal.objective}
Audience: ${input.goal.audience}

Channel: ${input.channel.name} on ${input.channel.platform} (a ${input.channel.type} channel)
Plan: ${input.plan.title} — ${input.plan.objective}
This specific task: ${input.todo.title} — ${input.todo.description}
${voiceSection(input.voice)}
Rules:
- This message will be sent to ONE person at a time, personalized first. It is not a broadcast.
  Write it so it only works personalized: leave at most two [square bracket] slots for details
  only the sender can know (e.g. [the thread where they mentioned this]), and nothing else
  templated. A message that could be mass-pasted verbatim is a failure.
- Lead with why THIS person, plainly. No fake familiarity, no "I loved your recent post" filler
  the sender didn't actually read.
- Disclose who's asking: the sender built the product and says so.
- One small, easy ask. No pressure, no false urgency, no "just bumping this" follow-up language.
- NEVER invent user counts, results, mutual contacts, or anything else as fact — the product may
  be pre-launch with zero data.
- Respect the platform: many communities ban unsolicited DMs. If ${input.channel.name} likely
  does, say so in your notes and shape the message to work as a public reply instead.
- Keep it short enough to read in one glance on a phone.`;
}

export async function writeOutreach(input: OutreachWriterInput): Promise<OutreachDraft> {
  // Cloudflare Workers AI (free). generateStructured re-validates + records usage; withRetry
  // covers Cloudflare's occasional non-conforming JSON.
  return withRetry(async () => {
    const draft = await generateStructured(buildPrompt(input), OutreachDraftSchema);
    if (!draft.message.trim()) throw new Error("Model returned an empty outreach message");
    return draft;
  });
}

/** Flattens the draft into the single text artifact stored on todos.output. */
export function formatOutreach(draft: OutreachDraft): string {
  const parts = [`Who to contact: ${draft.who.trim()}`];
  if (draft.subject.trim()) parts.push(`Subject: ${draft.subject.trim()}`);
  parts.push(draft.message.trim());
  if (draft.notes.trim()) parts.push(`---\nBefore you send: ${draft.notes.trim()}`);
  parts.push(
    "Fill every [bracketed] detail before sending — GrowthOS doesn't send anything, and this " +
      "message is written for one person at a time, not a list.",
  );
  return parts.join("\n\n");
}
