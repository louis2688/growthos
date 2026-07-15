export type CampaignStatus = "draft" | "researching" | "active" | "archived";
export type TodoStatus = "todo" | "in_progress" | "done";
export type Priority = "high" | "medium" | "low";
export type Confidence = "high" | "medium" | "low";
/** @deprecated alias kept for existing imports */
export type TodoPriority = Priority;

export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  campaign_id: string;
  objective: string;
  target_metric: string;
  target_value: string;
  timeframe: string;
  success_definition: string;
  audience: string;
  kpis: string[];
  validation_note: string | null;
};

export type Channel = {
  id: string;
  campaign_id: string;
  name: string;
  platform: string;
  type: string;
  reason: string;
  confidence: Confidence;
  selected: boolean;
};

export type Plan = {
  id: string;
  campaign_id: string;
  channel_id: string;
  title: string;
  objective: string;
  status: "active" | "archived";
  priority: Priority;
  generated_by_ai: boolean;
};

export type Todo = {
  id: string;
  campaign_id: string;
  plan_id: string;
  title: string;
  description: string;
  status: TodoStatus;
  priority: Priority;
  estimated_time: string | null;
  output: string | null;
  due_date: string | null; // ISO date (YYYY-MM-DD)
  created_at: string;
};

/** Wizard step derived from campaign status — single source of truth for routing. */
export function wizardStep(status: CampaignStatus): "review" | "channels" | "dashboard" {
  switch (status) {
    case "draft":
      return "review";
    case "researching":
      return "channels";
    default:
      return "dashboard";
  }
}
