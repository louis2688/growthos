import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODEL, anthropic } from "../lib/agents/run";

const VerdictSchema = z.object({
  violated: z.boolean().describe("true if the artifact commits the violation described"),
  evidence: z.string().describe("The exact text that violates it, or why it doesn't"),
});

export type Check = { pass: boolean; detail: string };

/**
 * Adversarial LLM judge. Prompted to FIND the violation rather than confirm the artifact is
 * fine — a judge that starts from "this looks good" rubber-stamps everything. Uncertainty
 * counts as a violation, because these artifacts get published to real communities and
 * emailed to real subscribers: a false pass is far more expensive than a false alarm.
 */
export async function judge(violation: string, artifact: string): Promise<Check> {
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: "adaptive" },
    output_config: { format: zodOutputFormat(VerdictSchema) },
    messages: [
      {
        role: "user",
        content: `You are auditing AI-generated marketing copy for ONE specific violation. Your job
is to FIND it, not to be charitable. This copy will be published to a real community or emailed
to real subscribers, so a violation you miss is a violation that ships.

THE VIOLATION:
${violation}

THE ARTIFACT:
---
${artifact}
---

Quote the exact offending text if it violates. If you are genuinely uncertain whether something
crosses the line, answer violated=true — an unnecessary alarm costs a re-read, a missed one costs
the user's credibility.`,
      },
    ],
  });

  const v = response.parsed_output;
  if (!v) return { pass: false, detail: "judge returned no verdict" };
  return { pass: !v.violated, detail: v.evidence };
}

/** A plain code assertion, for things that don't need a model to decide. */
export function assert(condition: boolean, detail: string): Check {
  return { pass: condition, detail };
}
