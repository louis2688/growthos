import IntakeForm from "./intake-form";

// Claude generation with adaptive thinking can take 1-3 minutes; the server
// action POSTs to this route, so it needs a long function timeout on Vercel.
export const maxDuration = 300;

export default function NewCampaignPage() {
  return <IntakeForm />;
}
