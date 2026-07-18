import { z } from "zod";
import { deadlineSignal, recordUsage } from "./run";

/**
 * SPIKE — structured-output calls to Cloudflare Workers AI text models. Not wired into
 * runTodoTool; exists to answer whether the free 8-agent half of the model split holds up
 * before committing to it.
 *
 * Why this needs its own validation layer, unlike the Anthropic path: Workers AI's JSON mode
 * does not guarantee schema conformance (Cloudflare's own docs: "can't guarantee that the
 * model responds according to the requested JSON Schema" — it can fail outright with
 * "JSON Mode couldn't be met"). Anthropic's structured outputs actually enforce the schema
 * server-side; this does not. So every response is re-validated with the same Zod schema
 * before the caller ever sees it — a plausible-looking but non-conforming response must
 * throw here, not surface as a good draft.
 *
 * Model choice is not "any Workers AI LLM": verified empirically that
 * @cf/meta/llama-3.1-8b-instruct-fp8 flatly rejects json_schema (403, "This model doesn't
 * support JSON Schema"), despite docs implying the whole Llama 3.1/3.3 family supports it.
 * @cf/meta/llama-3.3-70b-instruct-fp8-fast is the one confirmed working.
 */
export const CLOUDFLARE_TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const RENDER_DEADLINE_MS = 60_000;

/**
 * High by default and NOT optional in practice: Workers AI defaults max output low, and the
 * deep campaign_generator schema truncated mid-JSON ("Unterminated string") until this was
 * set — verified 8000 lets the full nested plan complete. Simple agents never reach it; a cap
 * only bounds runaway output, so erring high is free.
 */
const DEFAULT_MAX_TOKENS = 8000;

type WorkersAiResponse = {
  success: boolean;
  result?: { response?: unknown; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  errors?: unknown;
};

export async function generateStructured<T extends z.ZodTypeAny>(
  prompt: string,
  schema: T,
  opts: { model?: string; maxTokens?: number } = {},
): Promise<z.infer<T>> {
  const model = opts.model ?? CLOUDFLARE_TEXT_MODEL;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error(
      "This needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to be set.",
    );
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        // z.toJSONSchema, not a hand-written duplicate: the Zod schema stays the single
        // source of truth for the shape, same as zodOutputFormat does for the Anthropic path.
        response_format: { type: "json_schema", json_schema: z.toJSONSchema(schema) },
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      }),
      signal: deadlineSignal(RENDER_DEADLINE_MS),
    },
  );

  if (!res.ok) {
    throw new Error(`Workers AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const json = (await res.json()) as WorkersAiResponse;
  if (!json.success) {
    throw new Error(`Workers AI declined: ${JSON.stringify(json.errors ?? json).slice(0, 300)}`);
  }

  // Record the token counts so the run shows on Activity — priced at $0 (Workers AI free tier),
  // but the tokens are real and worth surfacing. No web searches on this path.
  const usage = json.result?.usage;
  if (usage) {
    recordUsage({
      input_tokens: usage.prompt_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? 0,
      server_tool_use: null,
    });
  }

  const raw = json.result?.response;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  // The re-validation this whole module exists for: a response that isn't actually valid
  // per the schema must fail loudly here, not slip through as a superficially-JSON draft.
  return schema.parse(parsed);
}
