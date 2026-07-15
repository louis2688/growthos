import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const CHANNELS = [
  "TikTok",
  "Reddit",
  "SEO",
  "App Store",
  "Product Hunt",
  "LinkedIn",
  "X (Twitter)",
  "YouTube",
  "Email",
  "Influencers",
  "Google Ads",
  "Facebook Ads",
] as const;

export type ChannelName = (typeof CHANNELS)[number];

// Bounds are guardrails, deliberately looser than the 15-30 the prompt asks
// for, so a near-miss payload (e.g. 13 todos) doesn't burn a retry.
export const CampaignGenSchema = z.object({
  title: z.string().describe("Short campaign title, e.g. 'Launch <Product>'"),
  channels: z
    .array(z.enum(CHANNELS))
    .min(3)
    .max(5)
    .describe("The 3-5 best-fit distribution channels"),
  todos: z
    .array(
      z.object({
        title: z.string().describe("Short imperative task title"),
        description: z
          .string()
          .describe("1-3 sentences: exactly what to do and what output to produce"),
        channel: z.enum(CHANNELS).describe("Must be one of the chosen channels"),
        priority: z.enum(["high", "medium", "low"]),
        tool: z
          .string()
          .describe("Recommended tool category, e.g. 'Video Generator', 'Keyword Research Tool'"),
        due_in_days: z
          .number()
          .int()
          .min(0)
          .max(120)
          .optional()
          .describe("Days from today, sequenced against the goal's timeframe"),
      }),
    )
    .min(10)
    .max(50),
});

export type CampaignGen = z.infer<typeof CampaignGenSchema>;

export type Intake = {
  productName: string;
  productDescription: string;
  audience: string;
  goal: string;
  budget?: string;
};

export function buildPrompt(intake: Intake): string {
  return `You are a growth marketing strategist. Create a concrete, executable growth campaign for the product below.

Product name: ${intake.productName}
What it does: ${intake.productDescription}
Target audience: ${intake.audience}
Goal: ${intake.goal}
Budget: ${intake.budget?.trim() || "not specified"}

Requirements:
- Pick the 3-5 channels that best fit this product, audience, and budget. Choose ONLY from: ${CHANNELS.join(", ")}.
- Create 15-30 concrete, actionable todos spread across the chosen channels. Every todo's channel must be one of the channels you picked.
- Each todo: a short imperative title, a 1-3 sentence description of exactly what to do and what output it produces, a priority, a recommended tool (plain-text category like "Video Generator" or "Keyword Research Tool"), and optionally due_in_days (days from today), sequenced sensibly against the goal's timeframe.
- Prioritize by expected impact toward the goal: quick wins and prerequisites are high priority.`;
}

async function callClaude(intake: Intake): Promise<CampaignGen> {
  // Constructed lazily so importing this module (e.g. in tests) never
  // requires ANTHROPIC_API_KEY.
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { format: zodOutputFormat(CampaignGenSchema) },
    messages: [{ role: "user", content: buildPrompt(intake) }],
  });
  if (!response.parsed_output) {
    throw new Error("Model returned no parsable campaign");
  }
  return response.parsed_output;
}

export async function generateCampaign(intake: Intake): Promise<CampaignGen> {
  try {
    return await callClaude(intake);
  } catch (err) {
    // API errors (auth, rate limit, overload) already get SDK-level retries;
    // re-raising them avoids a pointless duplicate call. Anything else is a
    // malformed/failed-validation output -> retry once per spec.
    if (err instanceof Anthropic.APIError) throw err;
    return await callClaude(intake);
  }
}
