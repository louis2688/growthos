import { z } from "zod";
import { withRetry } from "./run";
import { generateStructured } from "./cloudflare";

export const ToolRecommendationSchema = z.object({
  tools: z
    .array(
      z.object({
        tool_index: z.number().int().min(0).describe("Index into the numbered tool catalog"),
        reason: z
          .string()
          .describe("One sentence: why this tool fits THIS plan's channel and objective"),
        confidence: z.enum(["high", "medium", "low"]),
      }),
    )
    .max(4)
    .describe("Tools worth using for this plan — only genuinely useful ones, may be empty"),
  todo_tools: z
    .array(
      z.object({
        todo_index: z.number().int().min(0).describe("Index into the numbered todo list"),
        tool_index: z.number().int().min(0).describe("Index into the numbered tool catalog"),
      }),
    )
    .describe("Optional per-todo assignment — only where a tool clearly does that task"),
});

export type ToolRecommendation = z.infer<typeof ToolRecommendationSchema>;

export type RecommenderInput = {
  plan: { title: string; objective: string; channel: string; platform: string };
  todos: { title: string; description: string }[];
  catalog: { name: string; category: string; description: string }[];
};

function buildPrompt(input: RecommenderInput): string {
  const catalog = input.catalog
    .map((t, i) => `${i}. ${t.name} (${t.category}) — ${t.description}`)
    .join("\n");
  const todos = input.todos.map((t, i) => `${i}. ${t.title} — ${t.description}`).join("\n");

  return `You are a growth tooling advisor. Recommend tools from the catalog for ONE plan.

Plan: ${input.plan.title}
Channel: ${input.plan.channel} (${input.plan.platform})
Objective: ${input.plan.objective}

Todos (numbered — reference by index):
${todos}

Tool catalog (numbered — reference by index):
${catalog}

Suggest up to 4 tools that genuinely help THIS plan, each with a one-sentence reason tied to
this channel and objective, and a confidence. Do not pad the list — an irrelevant suggestion is
worse than none.

Then assign a tool to individual todos where one clearly does that task (e.g. a drafting tool
for a "write the post" todo). Leave a todo unassigned when no tool fits — most manual todos
(reading rules, replying to comments) should have none.`;
}

export async function recommendTools(input: RecommenderInput): Promise<ToolRecommendation> {
  if (input.catalog.length === 0) return { tools: [], todo_tools: [] };

  // Cloudflare Workers AI (free). generateStructured re-validates + records usage.
  return withRetry(async () => {
    const rec = await generateStructured(buildPrompt(input), ToolRecommendationSchema);
    // Out-of-range indices are malformed output; throwing lets withRetry re-run the call.
    for (const t of rec.tools) {
      if (t.tool_index >= input.catalog.length) {
        throw new Error(`Recommendation references tool_index ${t.tool_index} out of range`);
      }
    }
    for (const a of rec.todo_tools) {
      if (a.tool_index >= input.catalog.length) {
        throw new Error(`Assignment references tool_index ${a.tool_index} out of range`);
      }
      if (a.todo_index >= input.todos.length) {
        throw new Error(`Assignment references todo_index ${a.todo_index} out of range`);
      }
    }
    return rec;
  });
}
