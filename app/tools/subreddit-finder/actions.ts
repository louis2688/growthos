"use server";

import { researchChannels, type ChannelResearch } from "@/lib/agents/channel-research";
import { consumeSearchQuota } from "@/lib/rate-limit";

export type FinderState = {
  values: { name: string; description: string; audience: string };
  error?: string;
  channels?: ChannelResearch["channels"];
};

const MAX_DESCRIPTION = 600;
const MAX_AUDIENCE = 300;

export async function findChannels(
  _prev: FinderState | null,
  formData: FormData,
): Promise<FinderState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    audience: String(formData.get("audience") ?? "").trim(),
  };

  if (!values.name || !values.description) {
    return { values, error: "Add your product name and what it does." };
  }
  // Bound the prompt: an oversized paste is both a cost and an abuse vector. Enforced
  // server-side per field (the client maxLength doesn't stop a scripted POST).
  if (values.description.length > MAX_DESCRIPTION) {
    return { values, error: `Keep the description under ${MAX_DESCRIPTION} characters.` };
  }
  if (values.audience.length > MAX_AUDIENCE) {
    return { values, error: `Keep the audience under ${MAX_AUDIENCE} characters.` };
  }

  let verdict;
  try {
    // Derives + keys the caller's IP itself, on an unspoofable header — see lib/rate-limit.ts.
    verdict = await consumeSearchQuota();
  } catch {
    // Fail CLOSED: a rate-limit backend blip must not become an unmetered door to the paid
    // search agent. Better a "try again" than an uncapped bill.
    return { values, error: "The finder is briefly unavailable — please try again shortly." };
  }
  if (!verdict.ok) {
    return {
      values,
      error:
        verdict.scope === "ip"
          ? "You've used today's free AI runs (the finder and the homepage preview share them). Create a free account to keep going — campaigns there aren't limited like this."
          : "Our free tools have hit today's overall limit. Please try again tomorrow — or sign up free.",
    };
  }

  try {
    // Reuse the shipped, guardrailed channel-research agent (Haiku + live web search). The free
    // tool has no goal metrics, so we pass the objective and audience and leave the numeric
    // targets empty — the agent's prompt already handles an unspecified goal.
    const research = await researchChannels({
      productName: values.name,
      productDescription: values.description,
      goal: {
        objective: "Find the communities where this audience is active and reachable",
        target_metric: "",
        target_value: "",
        timeframe: "",
        audience: values.audience || "the product's likely early users",
      },
    });
    return { values, channels: research.channels };
  } catch {
    return { values, error: "The search didn't complete. Please try again." };
  }
}
