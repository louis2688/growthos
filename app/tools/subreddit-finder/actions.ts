"use server";

import { headers } from "next/headers";
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
  // Bound the prompt: an oversized paste is both a cost and an abuse vector.
  if (values.description.length > MAX_DESCRIPTION || values.audience.length > MAX_AUDIENCE) {
    return { values, error: `Keep the description under ${MAX_DESCRIPTION} characters.` };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  let verdict;
  try {
    verdict = await consumeSearchQuota(ip);
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
          ? "You've used today's free searches. Come back tomorrow, or start a free campaign to run more."
          : "The free finder has hit today's overall limit. Please try again tomorrow.",
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
