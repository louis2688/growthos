import { deadlineSignal } from "./run";
import {
  writeImagePrompt,
  type ImagePrompt,
  type ImagePromptInput,
} from "./image-prompt";

/**
 * Renders one illustration for a campaign todo.
 *
 * Two calls: writeImagePrompt (Claude — turns the marketing task into a visual scene, and is
 * where the "no charts, no fake numbers, no product screenshots" guardrail lives; its token
 * usage is recorded there) and renderImage (Cloudflare Workers AI, free tier — the render
 * itself costs nothing, which is why pricing stays single-provider).
 */

export const IMAGE_BUCKET = "campaign-images";

/** Deterministic per-todo path, so a re-run upserts the same object instead of accumulating. */
export function imagePath(campaignId: string, todoId: string): string {
  return `${campaignId}/${todoId}.jpg`;
}

/**
 * Removes EVERY object under a campaign's storage folder. storage.list() silently pages at
 * 100 objects, so a single list+remove leaves objects 101+ behind — in a public-by-URL
 * bucket that's a privacy-policy violation, not a leak of convenience. Loops until the
 * folder is empty; storage-js reports failures via the returned error (it never throws),
 * so callers must check the result.
 */
export async function purgeCampaignImages(
  storage: {
    list(
      path: string,
      options?: { limit?: number },
    ): Promise<{ data: { name: string }[] | null; error: { message: string } | null }>;
    remove(paths: string[]): Promise<{ data: unknown; error: { message: string } | null }>;
  },
  campaignId: string,
): Promise<{ error?: string }> {
  // ponytail: 100 pages = 10k objects, far beyond any real campaign; bail rather than spin.
  for (let page = 0; page < 100; page++) {
    const { data: objects, error: listError } = await storage.list(campaignId, { limit: 100 });
    if (listError) return { error: listError.message };
    if (!objects?.length) return {};
    const { error: removeError } = await storage.remove(
      objects.map((o) => `${campaignId}/${o.name}`),
    );
    if (removeError) return { error: removeError.message };
  }
  return { error: "Campaign folder has too many objects to purge." };
}

/** FLUX is ~7s; cap a hang well under the 300s function budget so a stuck render fails cleanly. */
const RENDER_DEADLINE_MS = 60_000;

type FluxResponse = {
  success: boolean;
  result?: { image?: string };
  errors?: unknown;
};

/**
 * Calls FLUX.1 schnell and returns the JPEG bytes. Deliberately one-shot (no retry): the free
 * tier can 429, but runTodoTool surfaces a retry to the user, and a silent retry would double
 * the render against a daily quota. The env guard throws a message the user can act on rather
 * than a raw fetch error, since a missing key is a setup problem, not a runtime one.
 */
export async function renderImage(prompt: string): Promise<Buffer> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error(
      "Image generation needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to be set.",
    );
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, steps: 4 }),
      signal: deadlineSignal(RENDER_DEADLINE_MS),
    },
  );

  if (!res.ok) {
    throw new Error(`Cloudflare image API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const json = (await res.json()) as FluxResponse;
  const b64 = json.result?.image;
  // The API returns HTTP 200 with success:false on a content or model error — check the body,
  // not just the status, or a refusal reads as a successful empty render.
  if (!json.success || typeof b64 !== "string") {
    throw new Error(`Cloudflare returned no image: ${JSON.stringify(json.errors ?? json).slice(0, 200)}`);
  }

  const bytes = Buffer.from(b64, "base64");
  if (bytes.length === 0) throw new Error("Cloudflare returned an empty image.");
  return bytes;
}

/** Prompt (for the text artifact + alt) plus the rendered bytes (for storage). */
export async function generateImage(
  input: ImagePromptInput,
): Promise<{ prompt: ImagePrompt; bytes: Buffer }> {
  const prompt = await writeImagePrompt(input);
  const bytes = await renderImage(prompt.prompt);
  return { prompt, bytes };
}
