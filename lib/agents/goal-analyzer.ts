import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODEL, anthropic, withRetry } from "./run";

export const GoalAnalysisSchema = z.object({
  objective: z.string().describe("The core objective, cleanly restated, e.g. 'Acquire users'"),
  target_metric: z.string().describe("What is measured, e.g. 'signups'"),
  target_value: z.string().describe("The number to hit, e.g. '100'"),
  timeframe: z.string().describe("e.g. '30 days'; empty string if the goal names none"),
  success_definition: z.string().describe("One sentence: what done looks like"),
  audience: z.string().describe("The target audience, derived from the product and goal"),
  kpis: z.array(z.string()).min(2).max(6).describe("Suggested KPIs to track"),
  validation_note: z
    .string()
    .nullable()
    .describe("null if the goal is realistic; otherwise a short, direct warning"),
});

export type GoalAnalysis = z.infer<typeof GoalAnalysisSchema>;

export type GoalInput = {
  productName: string;
  productDescription: string;
  rawGoal: string;
};

function buildPrompt(input: GoalInput): string {
  return `You are a growth strategist. Analyze this business goal.

Product: ${input.productName}
What it does: ${input.productDescription}
Goal as stated by the founder: ${input.rawGoal}

Derive the structured analysis:
- Restate the objective and split out the metric, target value, and timeframe.
- Derive the most plausible target audience from the product and goal.
- Suggest 2-6 KPIs worth tracking toward this goal.
- Reality-check the goal: if it is unrealistic for a typical early-stage product
  (e.g. "1M users in a week"), say so briefly and directly in validation_note;
  if it is reasonable, set validation_note to null.`;
}

export async function analyzeGoal(input: GoalInput): Promise<GoalAnalysis> {
  return withRetry(async () => {
    const response = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(GoalAnalysisSchema) },
      messages: [{ role: "user", content: buildPrompt(input) }],
    });
    if (!response.parsed_output) throw new Error("Model returned no parsable goal analysis");
    return response.parsed_output;
  });
}
