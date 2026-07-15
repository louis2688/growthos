import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODEL, anthropic, withRetry } from "./run";

export const EmailDigestSchema = z.object({
  subject: z.string().describe("Subject line — specific, not a teaser"),
  preview: z.string().describe("Preheader text shown after the subject in most inboxes"),
  body: z.string().describe("The full email, ready to paste."),
  notes: z.string().describe("Who to send it to, when, and anything to fill in before sending."),
});

export type EmailDigest = z.infer<typeof EmailDigestSchema>;

export type EmailDigestInput = {
  productName: string;
  productDescription: string;
  goal: { objective: string; audience: string };
  plan: { title: string; objective: string };
  todo: { title: string; description: string };
  /** Only todos actually marked done — the campaign's real milestones. */
  milestones: { title: string; plan: string }[];
  progress: { done: number; total: number };
};

function buildPrompt(input: EmailDigestInput): string {
  const milestones = input.milestones.length
    ? input.milestones.map((m) => `- ${m.title} (${m.plan})`).join("\n")
    : "(none completed yet)";

  return `You are writing one update email to ${input.productName}'s subscribers.

Product: ${input.productName}
What it does: ${input.productDescription}
Goal: ${input.goal.objective}
Audience: ${input.goal.audience}
Plan: ${input.plan.title} — ${input.plan.objective}
This specific task: ${input.todo.title} — ${input.todo.description}

Work completed so far (${input.progress.done} of ${input.progress.total} tasks):
${milestones}

Write the email from the completed work above and nothing else.

Rules:
- The completed list is the ONLY factual record you have. Do not invent milestones, launch
  dates, user numbers, revenue, press coverage, or customer quotes. You do not know them.
- Those entries are TASKS someone ticked off, not measured results. A task called "Reach 500
  subscribers" being done tells you the task was worked, NOT that 500 subscribers exist. Never
  restate a task title as an achieved number, outcome, or metric. If a task names a target,
  the target is not a result — say nothing about whether it was hit.
- If little or nothing is completed yet, write the honest version — an intro or a "here's what
  we're building and why" note — rather than manufacturing progress. Say so in your notes.
- Completed tasks are internal work items, not subscriber-facing news. Translate them into what
  the reader gains; drop the ones that mean nothing to an outsider.
- Give the reader something worth their time, not a status report about you.
- Anything you can't know (a real metric, a link, a date) goes in notes as something for the
  sender to fill in — never as a fabricated value in the body.
- Plain text, no markdown headers. Ready to paste.`;
}

export async function composeEmailDigest(input: EmailDigestInput): Promise<EmailDigest> {
  return withRetry(async () => {
    const response = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(EmailDigestSchema) },
      messages: [{ role: "user", content: buildPrompt(input) }],
    });
    if (!response.parsed_output) throw new Error("Model returned no parsable email digest");
    if (!response.parsed_output.body.trim()) throw new Error("Model returned an empty email body");
    return response.parsed_output;
  });
}

export function formatEmailDigest(digest: EmailDigest): string {
  const parts = [
    `Subject: ${digest.subject.trim()}`,
    `Preview: ${digest.preview.trim()}`,
    digest.body.trim(),
  ];
  if (digest.notes.trim()) parts.push(`---\nBefore sending: ${digest.notes.trim()}`);
  return parts.join("\n\n");
}
