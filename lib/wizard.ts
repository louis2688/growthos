import { redirect } from "next/navigation";
import { wizardStep, type CampaignStatus, type WizardStep } from "./types";

export function stepPath(campaignId: string, step: WizardStep): string {
  return step === "dashboard" ? `/campaigns/${campaignId}` : `/campaigns/${campaignId}/${step}`;
}

/** Sends an unfinished campaign back to whichever step its status says it's on. */
export function guardStep(campaignId: string, status: CampaignStatus, expected: WizardStep): void {
  const step = wizardStep(status);
  if (step !== expected) redirect(stepPath(campaignId, step));
}

/**
 * Recomposes a one-line goal from the analyzed goal fields — the raw intake text isn't
 * stored, so this is what "start from a past campaign" seeds the goal input with, and
 * what the campaign list and dashboard render as the goal line. One composition, three
 * surfaces: they must agree, or the duplicate flow seeds a goal the user doesn't
 * recognise from their own dashboard.
 */
export function goalSeed(goal: {
  objective: string;
  target_value: string;
  target_metric: string;
  timeframe: string;
}): string {
  return [
    goal.objective,
    goal.target_value && goal.target_metric ? `${goal.target_value} ${goal.target_metric}` : "",
    goal.timeframe ? `in ${goal.timeframe}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
}
