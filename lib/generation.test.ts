import { describe, expect, it } from "vitest";
import { CampaignGenSchema } from "./generation";

const todo = (i: number, channel = "TikTok") => ({
  title: `Todo ${i}`,
  description: "Do the thing and produce the output.",
  channel,
  priority: "high" as const,
  tool: "Video Generator",
  due_in_days: 7,
});

const valid = {
  title: "Launch AI Fitness App",
  channels: ["TikTok", "Reddit", "SEO"],
  todos: Array.from({ length: 15 }, (_, i) => todo(i)),
};

describe("CampaignGenSchema", () => {
  it("accepts a valid AI payload", () => {
    expect(CampaignGenSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a channel outside the curated list", () => {
    const bad = { ...valid, channels: ["TikTok", "Reddit", "Billboards"] };
    expect(CampaignGenSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a todo whose channel is outside the curated list", () => {
    const bad = { ...valid, todos: [...valid.todos.slice(0, 14), todo(14, "Billboards")] };
    expect(CampaignGenSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects too few todos", () => {
    const bad = { ...valid, todos: valid.todos.slice(0, 5) };
    expect(CampaignGenSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a todo without due_in_days", () => {
    const { due_in_days: _omitted, ...noDate } = todo(0);
    const ok = { ...valid, todos: [...valid.todos.slice(0, 14), noDate] };
    expect(CampaignGenSchema.safeParse(ok).success).toBe(true);
  });
});
