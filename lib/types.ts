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

/** Human labels for todo statuses — the raw enum has an underscore. */
export const TODO_STATUS_LABEL: Record<TodoStatus, string> = {
  backlog: "backlog",
  in_progress: "in progress",
  review: "review",
  done: "done",
};

export type AgentRunStatus = "running" | "ok" | "failed";

/** One traced agent call (migration 0010; usage columns 0011). */
export type AgentRun = {
  id: string;
  campaign_id: string;
  todo_id: string | null;
  agent: string;
  status: AgentRunStatus;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
  // Null on runs traced before 0011, and on runs still in flight — "not measured", which is
  // not the same as zero. Anything summing these must skip nulls, not coerce them to 0.
  input_tokens: number | null;
  output_tokens: number | null;
  web_search_requests: number | null;
};

/**
 * Human names for the agent keys written to agent_runs.agent. Falls back to the raw key,
 * so a newly added handler shows up as itself rather than vanishing from the UI.
 */
export const AGENT_LABEL: Record<string, string> = {
  channel_research: "Channel Research",
  campaign_generator: "Campaign Generator",
  tool_recommender: "Tool Recommender",
  post_writer: "AI Post Writer",
  seo_optimizer: "SEO Optimizer",
  email_digest: "Email Digest Composer",
  utm_builder: "Analytics Tracker",
  launch_timing: "Launch Scheduler",
};

export function agentLabel(key: string): string {
  return AGENT_LABEL[key] ?? key;
}

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

/** Agents that can actually run a todo. A tool with no handler is catalog-only. */
export type ToolHandler =
  | "post_writer"
  | "seo_optimizer"
  | "email_digest"
  | "utm_builder"
  | "launch_timing";

/** Global catalog row — not scoped to a campaign (domain-model-uml.html). */
export type Tool = {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  integration_type: ToolIntegration;
  status: ToolStatus;
  handler: ToolHandler | null;
  url: string | null;
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
  /** The artifact a tool run produced (e.g. a drafted post) — null until run. */
  output: string | null;
  /** Which tool actually produced `output` — may differ from tool_id after a reassign. */
  output_tool_id: string | null;
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
