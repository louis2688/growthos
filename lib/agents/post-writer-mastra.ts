/**
 * SPIKE — the same agent as post-writer.ts, run through Mastra instead of the Anthropic SDK.
 *
 * Exists to answer three questions that docs can't, before any decision to adopt Mastra more
 * widely:
 *   1. Does @mastra/core run in-process inside a Next.js server action on Vercel, within
 *      maxDuration=300, with no separate Mastra server?
 *   2. Can token usage still be recovered? Mastra's model router owns the model call, so the
 *      recordUsage(response.usage) hook the other nine agents use does not apply here. If the
 *      answer is no, adopting Mastra silently blinds the Activity page's spend number.
 *   3. Does the output still pass the guardrail evals? Same prompt, different plumbing — the
 *      evals are the bar.
 *
 * Deliberately reuses PostDraftSchema, buildPrompt and PostWriterInput from post-writer.ts:
 * the only variable under test is how the model is called. Nothing dispatches to this yet;
 * runTodoTool still routes post_writer to the Anthropic implementation.
 */
import { Agent } from "@mastra/core/agent";
import { PostDraftSchema, buildPrompt, type PostDraft, type PostWriterInput } from "./post-writer";
import { recordUsage } from "./run";

/**
 * Model string is Mastra's router format ("provider/model-name"), verified against the
 * provider registry script rather than recalled — it lists claude-opus-4-8 under `anthropic`.
 * The router reads ANTHROPIC_API_KEY from the environment, same key the SDK path uses.
 */
const postWriterAgent = new Agent({
  id: "post-writer",
  name: "Post Writer",
  // The real instruction is the per-call prompt; this only sets the persona, matching how the
  // SDK version passes everything in one user message.
  instructions: "You are a growth copywriter who writes posts that respect community norms.",
  model: "anthropic/claude-opus-4-8",
});

/**
 * Mastra reports usage in the AI SDK's shape, not the Anthropic SDK's, so recordUsage needs a
 * translation. Verified against a live response rather than the typings, which are genuinely
 * ambiguous here: @mastra/core also ships a TokenUsage with promptTokens/completionTokens, and
 * the docs label this return value with it. The real runtime keys are
 * `inputTokens, outputTokens, totalTokens, cachedInputTokens, cacheCreationInputTokens, raw`,
 * with inputTokens/outputTokens as flat numbers.
 *
 * The typeof guard is not paranoia. Inside `usage.raw`, Mastra nests the *same field names*
 * as objects (`inputTokens: { total, cacheRead, cacheWrite }`). If a future version promotes
 * that shape to the top level, a truthiness check would coerce an object into the token count
 * and write a garbage number to agent_runs. Returning null instead leaves the run recorded as
 * unmeasured — the honest failure, consistent with how pre-0011 rows are treated.
 */
type MastraUsage = { inputTokens?: unknown; outputTokens?: unknown };

export function normalizeUsage(
  usage: MastraUsage | undefined | null,
): { input_tokens: number; output_tokens: number } | null {
  if (!usage) return null;
  const { inputTokens, outputTokens } = usage;
  if (typeof inputTokens !== "number" || typeof outputTokens !== "number") return null;
  return { input_tokens: inputTokens, output_tokens: outputTokens };
}

export async function writePostViaMastra(input: PostWriterInput): Promise<PostDraft> {
  const response = await postWriterAgent.generate(buildPrompt(input), {
    structuredOutput: { schema: PostDraftSchema },
  });

  const usage = normalizeUsage(response.usage);
  // Only record what was actually reported. A missing usage shape must leave the run
  // unmeasured rather than assert it cost nothing.
  if (usage) recordUsage({ ...usage, server_tool_use: null });

  const draft = response.object;
  if (!draft) throw new Error("Mastra agent returned no parsable post draft");
  if (!draft.body.trim()) throw new Error("Mastra agent returned an empty post body");
  return draft;
}
