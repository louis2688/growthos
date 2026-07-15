export type CampaignStatus = "active" | "archived";
export type TodoStatus = "todo" | "in_progress" | "done";
export type TodoPriority = "high" | "medium" | "low";

export type Campaign = {
  id: string;
  title: string;
  goal: string;
  status: CampaignStatus;
  product_name: string;
  product_description: string;
  audience: string;
  budget: string | null;
  created_at: string;
};

export type Channel = {
  id: string;
  campaign_id: string;
  name: string;
};

export type Todo = {
  id: string;
  campaign_id: string;
  channel_id: string;
  title: string;
  description: string;
  status: TodoStatus;
  priority: TodoPriority;
  tool: string | null;
  due_date: string | null; // ISO date (YYYY-MM-DD)
  created_at: string;
};
