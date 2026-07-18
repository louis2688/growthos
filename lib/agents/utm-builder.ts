import { z } from "zod";
import { withRetry } from "./run";
import { generateStructured } from "./cloudflare";

/**
 * UTM values must be lowercase and URL-safe, or analytics tools split one link across buckets.
 *
 * A factory, not a shared instance: zodOutputFormat hoists a reused schema into $defs and every
 * field collapses to a bare $ref, silently dropping its .describe() before it reaches the model.
 */
const utmValue = () =>
  z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, "lowercase letters, digits, hyphen or underscore only");

export const UtmPlanSchema = z.object({
  source: utmValue().describe("Where the traffic comes from, normalised — e.g. 'reddit', 'indiehackers'"),
  medium: utmValue().describe(
    "Marketing medium using a conventional value analytics tools expect: social, referral, email, organic, cpc",
  ),
  content: utmValue().describe("Which specific placement this link is for, so two links never collide"),
  watch: z.string().describe("What to look at afterwards, and what would count as working."),
});

export type UtmPlan = z.infer<typeof UtmPlanSchema>;

/** The user hasn't told us their landing page, and inventing one would be a fabricated URL. */
export const URL_PLACEHOLDER = "{{YOUR_LANDING_PAGE_URL}}";

/**
 * utm_campaign is the key that makes a campaign's links aggregate into one report, so it must
 * be identical for every link. The model is called once per todo with no memory of prior runs,
 * so asking it for the slug produced a fresh guess each time — derive it from the campaign name
 * instead and it is stable by construction.
 */
export function campaignSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "campaign";
}

export type UtmBuilderInput = {
  productName: string;
  productDescription: string;
  goal: { objective: string; audience: string };
  channel: { name: string; platform: string; type: string };
  plan: { title: string; objective: string };
  todo: { title: string; description: string };
  /** Derived by the caller, identical for every link in the campaign. */
  campaign: string;
};

function buildPrompt(input: UtmBuilderInput): string {
  return `You are a growth analyst tagging one link so its signups can be attributed.

Product: ${input.productName}
What it does: ${input.productDescription}
Goal: ${input.goal.objective}
Audience: ${input.goal.audience}

Where the link will be posted: ${input.channel.name} on ${input.channel.platform} (a ${input.channel.type} channel)
Plan: ${input.plan.title} — ${input.plan.objective}
This specific task: ${input.todo.title} — ${input.todo.description}

utm_campaign is already fixed as "${input.campaign}" — you are choosing the other three for THIS
placement.

Rules:
- Every value: lowercase, no spaces, hyphens or underscores only. "Indie Hackers" is not a
  value; "indiehackers" is.
- source is the normalised platform, not the full channel title.
- medium must be a conventional value an analytics tool already understands — social, referral,
  email, organic, or cpc. Do not invent a new medium.
- content is what makes THIS placement distinct from every other link in the campaign.
- For 'watch', say what to actually look at and what result would mean it worked. Be concrete
  and honest — do not promise numbers, and do not state any figure as if you knew it. You have
  no access to their analytics.`;
}

export async function buildUtm(input: UtmBuilderInput): Promise<UtmPlan> {
  // Cloudflare Workers AI (free). generateStructured re-validates against UtmPlanSchema — so a
  // value that breaks the lowercase/URL-safe rule throws and withRetry re-runs — and records usage.
  return withRetry(() => generateStructured(buildPrompt(input), UtmPlanSchema));
}

/**
 * Assembles the tagged URL in code rather than letting the model write it: the model
 * supplies only the values, so the URL can't come back malformed — or with an invented
 * domain. The placeholder is deliberately obvious.
 */
export function formatUtm(plan: UtmPlan, campaign: string): string {
  const query = [
    ["utm_source", plan.source],
    ["utm_medium", plan.medium],
    ["utm_campaign", campaign],
    ["utm_content", plan.content],
  ]
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  return [
    `${URL_PLACEHOLDER}?${query}`,
    `---\nReplace ${URL_PLACEHOLDER} with the page this link should open — GrowthOS doesn't know your URL. ` +
      `If that page already contains a "?", change the "?" before utm_source to "&".`,
    `What to watch: ${plan.watch.trim()}`,
  ].join("\n\n");
}
