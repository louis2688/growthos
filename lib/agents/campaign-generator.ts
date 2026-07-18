import { z } from "zod";
import { withRetry } from "./run";
import { generateStructured } from "./cloudflare";
import type { GoalAnalysis } from "./goal-analyzer";

export const CampaignPlanSchema = z.object({
  plans: z
    .array(
      z.object({
        channel_index: z
          .number()
          .int()
          .min(0)
          .describe("Index into the numbered channel list you were given"),
        title: z.string().describe("Plan title, e.g. 'Reddit Outreach'"),
        objective: z.string().describe("One sentence: what this plan achieves on this channel"),
        priority: z.enum(["high", "medium", "low"]),
        todos: z
          .array(
            z.object({
              title: z.string().describe("Short imperative task"),
              description: z
                .string()
                .describe("1-3 sentences: exactly what to do and what output it produces"),
              priority: z.enum(["high", "medium", "low"]),
              estimated_time: z.string().optional().describe("e.g. '2 hours', '30 min'"),
              due_in_days: z.number().int().min(0).max(180).optional(),
            }),
          )
          .min(3)
          .max(10),
      }),
    )
    .min(1)
    .max(8),
});

export type CampaignPlan = z.infer<typeof CampaignPlanSchema>;

export type GeneratorInput = {
  productName: string;
  productDescription: string;
  goal: GoalAnalysis;
  channels: { name: string; platform: string; reason: string }[]; // the SELECTED channels
};

function buildPrompt(input: GeneratorInput): string {
  const channelList = input.channels
    .map((c, i) => `${i}. ${c.name} (${c.platform}) — ${c.reason}`)
    .join("\n");

  return `You are a growth campaign planner. Build an execution plan for each selected channel.

Product: ${input.productName}
What it does: ${input.productDescription}
Objective: ${input.goal.objective} — ${input.goal.target_value} ${input.goal.target_metric} in ${input.goal.timeframe || "an unspecified timeframe"}
Audience: ${input.goal.audience}
Success: ${input.goal.success_definition}

Selected channels (numbered — reference by index):
${channelList}

Create exactly one Plan per channel:
- title (e.g. "Reddit Outreach"), a one-sentence objective, and a priority reflecting
  expected impact toward the goal.
- 3-8 concrete todos per plan, sequenced sensibly against the timeframe: short imperative
  title, a description of exactly what to do and what output it produces, priority,
  estimated_time, and due_in_days from today.`;
}

export async function generateCampaignPlan(input: GeneratorInput): Promise<CampaignPlan> {
  // Cloudflare Workers AI (free). This is the deepest schema (plans → todos); the helper's
  // default max_tokens is set high enough to keep the nested JSON from truncating (verified).
  return withRetry(async () => {
    const plan = await generateStructured(buildPrompt(input), CampaignPlanSchema);
    // channel_index must reference a real selected channel; a bad index is
    // malformed output, so throwing here lets withRetry re-run the call.
    for (const p of plan.plans) {
      if (p.channel_index >= input.channels.length) {
        throw new Error(`Plan references channel_index ${p.channel_index} out of range`);
      }
    }
    return plan;
  });
}
