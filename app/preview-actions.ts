"use server";

import { analyzeGoal, type GoalAnalysis } from "@/lib/agents/goal-analyzer";
import { researchChannels, type ChannelResearch } from "@/lib/agents/channel-research";
import { consumeSearchQuota } from "@/lib/rate-limit";

// The unauthenticated homepage preview (roadmap #61): a visitor types product + goal on the
// landing and sees a live goal analysis + researched channels BEFORE signup. Nothing is saved —
// the wizard (/new) is where real campaigns are created.
//
// Cost containment: this runs goal_analyzer (Cloudflare free tier — free but still bounded by
// the account's daily allocation) and channel_research (Haiku + live web search — real money).
// One preview consumes one unit of the SAME durable per-IP + global daily quota as the public
// Subreddit Finder, checked BEFORE any agent call, in this single action — deliberately not two
// chained actions, which would leave the expensive half separately callable and unmetered.

export type PreviewState = {
  values: { name: string; description: string; rawGoal: string };
  error?: string;
  analysis?: GoalAnalysis;
  channels?: ChannelResearch["channels"];
  /** Set when analysis succeeded but the live channel search failed — partial result. */
  channelsError?: string;
};

// Bound the prompt: an oversized paste is both a cost and an abuse vector. The client inputs
// carry matching maxLength, but nothing stops a scripted POST, so each cap is enforced here
// with a message naming the field it's about.
const LIMITS = [
  ["name", 80, "Keep the product name under 80 characters."],
  ["description", 600, "Keep the description under 600 characters."],
  ["rawGoal", 200, "Keep the goal under 200 characters."],
] as const;

export async function previewCampaign(
  _prev: PreviewState | null,
  formData: FormData,
): Promise<PreviewState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    rawGoal: String(formData.get("rawGoal") ?? "").trim(),
  };

  if (!values.name || !values.description || !values.rawGoal) {
    return { values, error: "Fill in all three fields to preview." };
  }
  for (const [field, max, message] of LIMITS) {
    if (values[field].length > max) return { values, error: message };
  }

  let verdict;
  try {
    verdict = await consumeSearchQuota();
  } catch {
    // Fail CLOSED: a limiter blip must not become an unmetered door to the paid agents.
    return { values, error: "The preview is briefly unavailable — please try again shortly." };
  }
  if (!verdict.ok) {
    return {
      values,
      error:
        verdict.scope === "ip"
          ? "You've used today's free AI runs (the preview and the Subreddit Finder share them). Create a free account to keep going — campaigns there aren't limited like this."
          : "Our free tools have hit today's overall limit. Please try again tomorrow — or sign up free.",
    };
  }

  const started = Date.now();
  let analysis: GoalAnalysis;
  try {
    analysis = await analyzeGoal({
      productName: values.name,
      productDescription: values.description,
      rawGoal: values.rawGoal,
    });
  } catch {
    return { values, error: "The preview didn't complete. Please try again." };
  }

  try {
    // Both agents share this ONE function invocation, capped at maxDuration=300 on app/page.tsx.
    // Hand channel research only the budget the analysis phase left over (300s minus elapsed,
    // minus ~30s headroom for the pause/resume loop's own catch to fire before Vercel kills us).
    const remainingMs = Math.max(45_000, 270_000 - (Date.now() - started));
    const research = await researchChannels(
      { productName: values.name, productDescription: values.description, goal: analysis },
      { deadlineMs: remainingMs },
    );
    return { values, analysis, channels: research.channels };
  } catch {
    // The analysis alone is still the magic-moment half — show it rather than discarding it.
    return {
      values,
      analysis,
      channelsError:
        "Live channel search didn't complete this time. Your goal analysis is above — sign up free to run the full research as a campaign.",
    };
  }
}
