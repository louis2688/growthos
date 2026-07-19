import { z } from "zod";

/**
 * UTM values must be lowercase and URL-safe, or analytics tools split one link across buckets.
 *
 * This used to be an AI agent; it is now pure code (task #57). The model was only choosing
 * three slugs and writing a watch note — all derivable from data we already have — and the
 * agreed credit rule is "every AI call costs credits". Deterministic means it's genuinely the
 * free tool: no API, no credits, no way to hallucinate, instant.
 */
const utmValue = () =>
  z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, "lowercase letters, digits, hyphen or underscore only");

export const UtmPlanSchema = z.object({
  source: utmValue(),
  medium: utmValue(),
  content: utmValue(),
  watch: z.string(),
});

export type UtmPlan = z.infer<typeof UtmPlanSchema>;

/** The user hasn't told us their landing page, and inventing one would be a fabricated URL. */
export const URL_PLACEHOLDER = "{{YOUR_LANDING_PAGE_URL}}";

/**
 * utm_campaign is the key that makes a campaign's links aggregate into one report, so it must
 * be identical for every link — derived from the campaign name, stable by construction.
 */
export function campaignSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "campaign";
}

export type UtmBuilderInput = {
  channel: { name: string; platform: string; type: string };
  todo: { title: string; description: string };
  /** Derived by the caller, identical for every link in the campaign. */
  campaign: string;
};

/** Slug with a fallback so a value can never be empty (the schema regex rejects empty). */
function slugOr(raw: string, fallback: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

/**
 * medium must be a conventional value analytics tools already understand. Keyword-mapped;
 * "referral" is the safe default for anything unrecognized. Order matters: paid beats organic
 * ("paid search" is cpc), and the organic check reads the channel TYPE only — a platform NAMED
 * "Search Engine Journal" is a publication placement, not organic search. \bsearch\b also keeps
 * "research" from matching.
 */
export function mediumFor(type: string, platform: string): string {
  const t = type.toLowerCase();
  const both = `${t} ${platform.toLowerCase()}`;
  if (/mail|newsletter|digest/.test(both)) return "email";
  if (/\bads?\b|cpc|ppc|sponsor|paid/.test(both)) return "cpc";
  if (/\bseo\b|\bsearch\b|blog|organic/.test(t)) return "organic";
  if (/social|communit|forum|group|reddit|twitter|linkedin|facebook|instagram|tiktok|youtube|discord|slack/.test(both))
    return "social";
  return "referral";
}

export function buildUtm(input: UtmBuilderInput): UtmPlan {
  const content = slugOr(input.todo.title, "placement");
  // source is CONCATENATED ("indiehackers", not "indie-hackers") — the old agent's prompted
  // convention. Links posted before this rewrite used it; hyphenating now would split one
  // channel's traffic across two utm_source buckets.
  const source = input.channel.platform.toLowerCase().replace(/[^a-z0-9]/g, "") || "web";
  return {
    source,
    medium: mediumFor(input.channel.type, input.channel.platform),
    content,
    // Honest by construction: names what to look at, promises no numbers.
    watch:
      `Traffic arriving with utm_content=${content} in your analytics during the week after ` +
      `posting on ${input.channel.name}. Compare it against your other placements — a steady ` +
      "trickle that converts beats a spike that doesn't.",
  };
}

/**
 * Assembles the tagged URL in code: values are slug-validated, the campaign key is stable, and
 * the placeholder is deliberately obvious.
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
