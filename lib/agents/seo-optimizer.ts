import { z } from "zod";
import { withRetry } from "./run";
import { generateStructured } from "./cloudflare";
import { voiceSection, type BrandVoice } from "./brand-voice";

export const SeoRewriteSchema = z.object({
  keywords: z
    .array(z.string())
    .min(3)
    .max(8)
    .describe("Target search terms this audience would actually type"),
  title: z.string().describe("Headline carrying the primary keyword. Empty if the channel has none."),
  body: z.string().describe("The full copy, ready to paste."),
  notes: z.string().describe("What you changed and why, or what to watch when publishing."),
});

export type SeoRewrite = z.infer<typeof SeoRewriteSchema>;

export type SeoOptimizerInput = {
  productName: string;
  productDescription: string;
  goal: { objective: string; audience: string };
  channel: { name: string; platform: string; type: string };
  plan: { title: string; objective: string };
  todo: { title: string; description: string };
  voice?: BrandVoice | null;
};

function buildPrompt(input: SeoOptimizerInput): string {
  return `You are an SEO writer who refuses to make copy worse.

Product: ${input.productName}
What it does: ${input.productDescription}
Goal: ${input.goal.objective}
Audience: ${input.goal.audience}

Where it publishes: ${input.channel.name} on ${input.channel.platform} (a ${input.channel.type} channel)
Plan: ${input.plan.title} — ${input.plan.objective}
This specific task: ${input.todo.title} — ${input.todo.description}

Choose the target keywords, then write the copy around them.
${voiceSection(input.voice)}
Rules:
- Choose keywords this audience would really search. No stuffing: if a keyword can't sit in a
  sentence a human would say, leave it out and say so in your notes.
- Search intent beats keyword density. Copy that ranks and reads like a brochure has failed.
- Never invent statistics, testimonials, prices, awards, or user counts. You do not know them.
- Match the channel. Reddit and Hacker News punish SEO-shaped writing; a blog or directory
  listing rewards it. If keyword optimisation would hurt on this channel, optimise lightly and
  explain that in your notes.
- Respect community norms. If this channel expects you to disclose that you built the product,
  disclose it plainly — ranking is never a reason to hide who is posting.
- Return the finished copy, not instructions. No "[keyword here]" placeholders.`;
}

export async function optimizeForSeo(input: SeoOptimizerInput): Promise<SeoRewrite> {
  // Cloudflare Workers AI (free). generateStructured re-validates + records usage.
  return withRetry(async () => {
    const rewrite = await generateStructured(buildPrompt(input), SeoRewriteSchema);
    if (!rewrite.body.trim()) throw new Error("Model returned an empty body");
    return rewrite;
  });
}

export function formatSeoRewrite(rewrite: SeoRewrite): string {
  const parts = [rewrite.title.trim(), rewrite.body.trim()].filter(Boolean);
  parts.push(`---\nTarget keywords: ${rewrite.keywords.join(", ")}`);
  if (rewrite.notes.trim()) parts.push(`Editor's notes: ${rewrite.notes.trim()}`);
  return parts.join("\n\n");
}
