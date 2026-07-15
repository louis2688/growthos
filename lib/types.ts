export type CampaignStatus = "draft" | "researching" | "reviewing" | "active" | "archived";
export type TodoStatus = "backlog" | "in_progress" | "review" | "done";
export type PlanStatus = "planned" | "active" | "archived";
export type Priority = "high" | "medium" | "low";
export type Confidence = "high" | "medium" | "low";
export type ToolCategory = "ai" | "marketing" | "content" | "analytics" | "outreach";
export type ToolIntegration = "internal" | "api" | "link-out";
export type ToolStatus = "active" | "beta" | "disabled";

/** Kanban column order (campaign-kanban.html). */
export const TODO_STATUSES: TodoStatus[] = ["backlog", "in_progress", "review", "done"];

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
  status: PlanStatus;
  priority: Priority;
  generated_by_ai: boolean;
};

/** Global catalog row — not scoped to a campaign (domain-model-uml.html). */
export type Tool = {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  integration_type: ToolIntegration;
  status: ToolStatus;
  created_at: string;
  updated_at: string;
};

/** AI's per-plan tool suggestion, with the reason it was suggested. */
export type PlanTool = {
  id: string;
  plan_id: string;
  tool_id: string;
  reason: string;
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
  tool_id: string | null;
  due_date: string | null; // ISO date (YYYY-MM-DD)
  created_at: string;
};

export type WizardStep = "analysis" | "channels" | "review" | "dashboard";

/** Wizard step derived from campaign status — single source of truth for routing. */
export function wizardStep(status: CampaignStatus): WizardStep {
  switch (status) {
    case "draft":
      return "analysis";
    case "researching":
      return "channels";
    case "reviewing":
      return "review";
    default:
      return "dashboard";
  }
}

/** Stepper positions from campaign-creation.html: Goal, Analysis, Channels, Review, Created. */
export const WIZARD_STEPS = ["Goal", "Analysis", "Channels", "Review", "Created"] as const;
