import { z } from "zod";
import { oneLine, withRetry } from "./run";
import { generateStructured } from "./cloudflare";

export const ImagePromptSchema = z.object({
  prompt: z
    .string()
    .describe("The image generator prompt. A visual scene description only, under 400 characters."),
  alt: z.string().describe("Alt text describing what the finished image shows, for screen readers."),
  notes: z
    .string()
    .describe("What to check before posting, and anything the image deliberately leaves out."),
});

export type ImagePrompt = z.infer<typeof ImagePromptSchema>;

export type ImagePromptInput = {
  productName: string;
  productDescription: string;
  goal: { objective: string; audience: string };
  channel: { name: string; platform: string; type: string };
  plan: { title: string; objective: string };
  todo: { title: string; description: string };
};

function buildPrompt(input: ImagePromptInput): string {
  return `Turn this marketing task into a prompt for a text-to-image model.

Product: ${input.productName}
What it does: ${input.productDescription}
Audience: ${input.goal.audience}
Where it posts: ${input.channel.name} on ${input.channel.platform} (a ${input.channel.type} channel)
Plan: ${input.plan.title} — ${input.plan.objective}
This specific task: ${input.todo.title} — ${input.todo.description}

You are writing a prompt for FLUX.1 schnell, an open image model. Describe a SCENE — subject,
composition, style, colour, lighting. You are not writing marketing copy, and the image model
cannot read your intent, only your description.

Rules:
- No words, text, letters, numbers, labels, or UI copy anywhere in the image. This model renders
  text as convincing-looking gibberish. Say "no text" in the prompt itself.
- No charts, graphs, dashboards, metrics, counters, or up-and-to-the-right lines. And no growth
  motif of ANY kind, even abstract or "subtle": no rising arrow, ascending shape, upward trend in
  the composition, or anything that implies things are going up or improving. A picture that
  implies a result is claiming one you cannot support. An invented statistic is a lie whether
  written in a sentence or drawn in a picture, and you do not know this product's numbers.
- No fake product screenshots or invented UI. You have not seen ${input.productName} and cannot
  depict what it looks like.
- No logos, brand marks, or recognisable real people. No faces presented as customers — a
  stranger's photo implying a testimonial is a fabricated endorsement.
- Evoke the audience's problem or the feeling of the fix, not the product itself. A concrete
  everyday object or scene beats an abstract "innovation" render.
- Keep it under 400 characters and describe one image, not a series.
- In notes, say plainly what the image does not claim, and remind the reader to check it before
  posting: this model has no understanding of your product.`;
}

/** Flattens the prompt into the text artifact shown alongside the rendered image. */
export function formatImagePrompt(p: ImagePrompt): string {
  const parts = [`Image prompt: ${p.prompt.trim()}`, `Alt text: ${p.alt.trim()}`];
  if (p.notes.trim()) parts.push(`---\nBefore posting: ${p.notes.trim()}`);
  return parts.join("\n\n");
}

export async function writeImagePrompt(input: ImagePromptInput): Promise<ImagePrompt> {
  // Cloudflare Workers AI (free) writes the prompt; the FLUX render (also Cloudflare, free)
  // happens downstream in image-generator.ts. generateStructured re-validates + records usage.
  return withRetry(async () => {
    const parsed = await generateStructured(buildPrompt(input), ImagePromptSchema);
    if (!parsed.prompt.trim()) throw new Error("Model returned an empty image prompt");
    // Single-line: the prompt is sent verbatim as a JSON string field to the image model, and
    // the same stray-control-character problem that hit launch timing applies here.
    return { ...parsed, prompt: oneLine(parsed.prompt) };
  });
}
