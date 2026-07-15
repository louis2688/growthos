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
