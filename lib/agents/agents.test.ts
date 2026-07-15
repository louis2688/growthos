import { describe, expect, it } from "vitest";
import { GoalAnalysisSchema } from "./goal-analyzer";
import { ChannelResearchSchema } from "./channel-research";
import { CampaignPlanSchema } from "./campaign-generator";
import { ToolRecommendationSchema, recommendTools } from "./tool-recommender";

describe("GoalAnalysisSchema", () => {
  const valid = {
    objective: "Acquire users",
    target_metric: "signups",
    target_value: "100",
    timeframe: "30 days",
    success_definition: "100 signups within 30 days of launch.",
    audience: "budget-conscious young professionals",
    kpis: ["signups", "activation rate"],
    validation_note: null,
  };

  it("accepts a valid analysis", () => {
    expect(GoalAnalysisSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a validation warning string", () => {
    expect(
      GoalAnalysisSchema.safeParse({ ...valid, validation_note: "Very aggressive timeline." })
        .success,
    ).toBe(true);
  });

  it("rejects missing audience", () => {
    const { audience: _a, ...rest } = valid;
    expect(GoalAnalysisSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects too few KPIs", () => {
    expect(GoalAnalysisSchema.safeParse({ ...valid, kpis: ["signups"] }).success).toBe(false);
  });
});

describe("ChannelResearchSchema", () => {
  const channel = (name: string) => ({
    name,
    platform: "Reddit",
    type: "community",
    reason: "The audience actively discusses budgeting here.",
    confidence: "high" as const,
  });
  const valid = { channels: [1, 2, 3, 4, 5, 6].map((i) => channel(`r/community${i}`)) };

  it("accepts a valid research payload", () => {
    expect(ChannelResearchSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid confidence value", () => {
    const bad = {
      channels: [...valid.channels.slice(0, 5), { ...channel("r/x"), confidence: "certain" }],
    };
    expect(ChannelResearchSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects too few channels", () => {
    expect(ChannelResearchSchema.safeParse({ channels: valid.channels.slice(0, 2) }).success).toBe(
      false,
    );
  });
});

describe("CampaignPlanSchema", () => {
  const todo = (i: number) => ({
    title: `Todo ${i}`,
    description: "Do the thing and produce the output.",
    priority: "high" as const,
    estimated_time: "1 hour",
    output: "A published post",
    due_in_days: 7,
  });
  const valid = {
    plans: [
      {
        channel_index: 0,
        title: "Reddit Outreach",
        objective: "Build trust and drive signups from r/personalfinance.",
        priority: "high" as const,
        todos: [1, 2, 3].map(todo),
      },
    ],
  };

  it("accepts a valid plan payload", () => {
    expect(CampaignPlanSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts todos without optional fields", () => {
    const minimal = {
      plans: [
        {
          ...valid.plans[0],
          todos: [1, 2, 3].map((i) => ({
            title: `Todo ${i}`,
            description: "d",
            priority: "low" as const,
          })),
        },
      ],
    };
    expect(CampaignPlanSchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects a plan with too few todos", () => {
    const bad = { plans: [{ ...valid.plans[0], todos: [todo(1)] }] };
    expect(CampaignPlanSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a negative channel_index", () => {
    const bad = { plans: [{ ...valid.plans[0], channel_index: -1 }] };
    expect(CampaignPlanSchema.safeParse(bad).success).toBe(false);
  });
});

describe("ToolRecommendationSchema", () => {
  const valid = {
    tools: [{ tool_index: 0, reason: "Drafts the post in subreddit tone.", confidence: "high" }],
    todo_tools: [{ todo_index: 1, tool_index: 0 }],
  };

  it("accepts a valid recommendation", () => {
    expect(ToolRecommendationSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an empty recommendation — no tool fits is a valid answer", () => {
    expect(ToolRecommendationSchema.safeParse({ tools: [], todo_tools: [] }).success).toBe(true);
  });

  it("rejects more than 4 suggested tools", () => {
    const bad = { ...valid, tools: [0, 1, 2, 3, 4].map((i) => ({ ...valid.tools[0], tool_index: i })) };
    expect(ToolRecommendationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an invalid confidence value", () => {
    const bad = { ...valid, tools: [{ ...valid.tools[0], confidence: "certain" }] };
    expect(ToolRecommendationSchema.safeParse(bad).success).toBe(false);
  });
});

describe("recommendTools", () => {
  it("short-circuits on an empty catalog without calling the model", async () => {
    const rec = await recommendTools({
      plan: { title: "T", objective: "o", channel: "c", platform: "p" },
      todos: [{ title: "t", description: "d" }],
      catalog: [],
    });
    expect(rec).toEqual({ tools: [], todo_tools: [] });
  });
});
