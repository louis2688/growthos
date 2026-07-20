import { z } from "zod";
import { withRetry } from "./run";
import { generateStructured } from "./cloudflare";

export const PhLaunchKitSchema = z.object({
  tagline: z
    .string()
    .max(80)
    .describe("Product Hunt tagline, under 60 characters. What it is, not how great it is."),
  listing: z
    .string()
    .describe("The listing description: 2-4 plain sentences on what it does and who it's for."),
  maker_comment: z
    .string()
    .describe(
      "The first maker comment: the real story — why it was built, what's hard, what feedback " +
        "is wanted. First person, no pitch voice.",
    ),
  checklist: z
    .array(z.string())
    .min(4)
    .max(8)
    .describe("Day-one items: what to have ready before 12:01am PT and what to do in the first hours."),
  notes: z
    .string()
    .describe("PH-specific guidance: rules that get launches flagged, hunter etiquette, timing caveats."),
});

export type PhLaunchKit = z.infer<typeof PhLaunchKitSchema>;

export type PhLaunchKitInput = {
  productName: string;
  productDescription: string;
  goal: { objective: string; audience: string };
  plan: { title: string; objective: string };
  todo: { title: string; description: string };
};

function buildPrompt(input: PhLaunchKitInput): string {
  return `You are a Product Hunt launch coach. Draft the launch kit — the words and the day-one plan.

Product: ${input.productName}
What it does: ${input.productDescription}
Goal: ${input.goal.objective}
Audience: ${input.goal.audience}
Plan: ${input.plan.title} — ${input.plan.objective}
This specific task: ${input.todo.title} — ${input.todo.description}

Rules:
- The tagline says what the product IS in under 60 characters. No superlatives, no "game-changing".
- The listing description is 2-4 sentences a stranger understands: what it does, for whom, and
  what's genuinely different. Plain words.
- The maker comment is a founder talking, not a press release: why they built it, one honest
  hard part, and a specific question inviting feedback. NEVER invent traction, revenue, user
  counts, or testimonials — this product may be pre-launch with zero data.
- Product Hunt bans vote solicitation. Nothing anywhere in the kit may ask anyone to upvote —
  not friends, not a community, not "support us on PH". Sharing the launch link and asking for
  honest feedback is fine; asking for votes gets launches flagged. Put this warning in the notes.
- The checklist covers the mechanics: assets ready before 12:01am PT, replying to every comment
  in the first hours, where to share the link (with feedback framing, never vote-begging).
- You draft. Nothing here schedules or publishes — the maker does everything on producthunt.com.`;
}

export async function draftLaunchKit(input: PhLaunchKitInput): Promise<PhLaunchKit> {
  // Cloudflare Workers AI (free). generateStructured re-validates + records usage; withRetry
  // also covers a tagline that overruns the schema's hard cap.
  return withRetry(async () => {
    const kit = await generateStructured(buildPrompt(input), PhLaunchKitSchema);
    if (!kit.tagline.trim() || !kit.maker_comment.trim()) {
      throw new Error("Model returned an empty launch kit");
    }
    return kit;
  });
}

/** Flattens the kit into the single text artifact stored on todos.output. */
export function formatLaunchKit(kit: PhLaunchKit): string {
  return [
    `Tagline: ${kit.tagline.trim()}`,
    `Listing description:\n${kit.listing.trim()}`,
    `First maker comment:\n${kit.maker_comment.trim()}`,
    `---\nLaunch day:\n${kit.checklist.map((c) => `- ${c}`).join("\n")}`,
    kit.notes.trim(),
    "You launch this yourself on producthunt.com — GrowthOS doesn't schedule or publish anything.",
  ].join("\n\n");
}
