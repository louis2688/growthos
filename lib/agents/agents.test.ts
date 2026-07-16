import { describe, expect, it } from "vitest";
import { GoalAnalysisSchema } from "./goal-analyzer";
import { ChannelResearchSchema } from "./channel-research";
import { CampaignPlanSchema } from "./campaign-generator";
import { ToolRecommendationSchema, recommendTools } from "./tool-recommender";
import { PostDraftSchema, formatDraft } from "./post-writer";
import { SeoRewriteSchema, formatSeoRewrite } from "./seo-optimizer";
import { EmailDigestSchema, formatEmailDigest } from "./email-digest";
import { UtmPlanSchema, campaignSlug, formatUtm, URL_PLACEHOLDER } from "./utm-builder";
import { LaunchTimingSchema, formatTiming } from "./launch-timing";

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

describe("PostDraftSchema", () => {
  const valid = { title: "How I track freelance income", body: "Post body here.", notes: "Post Tuesday AM." };

  it("accepts a valid draft", () => {
    expect(PostDraftSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an empty title — some channels have no subject line", () => {
    expect(PostDraftSchema.safeParse({ ...valid, title: "" }).success).toBe(true);
  });

  it("rejects a draft missing a body", () => {
    const { body: _b, ...rest } = valid;
    expect(PostDraftSchema.safeParse(rest).success).toBe(false);
  });
});

describe("formatDraft", () => {
  it("joins title, body and notes into one pasteable artifact", () => {
    expect(formatDraft({ title: "T", body: "B", notes: "N" })).toBe("T\n\nB\n\n---\nPosting notes: N");
  });

  it("omits an empty title and empty notes", () => {
    expect(formatDraft({ title: "", body: "B", notes: "" })).toBe("B");
  });
});

describe("SeoRewriteSchema", () => {
  const valid = {
    keywords: ["freelance expense tracking", "irregular income budgeting", "1099 bookkeeping"],
    title: "Freelance expense tracking that survives tax season",
    body: "Copy here.",
    notes: "Kept the original voice.",
  };

  it("accepts a valid rewrite", () => {
    expect(SeoRewriteSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects too few keywords", () => {
    expect(SeoRewriteSchema.safeParse({ ...valid, keywords: ["one", "two"] }).success).toBe(false);
  });

  it("rejects keyword stuffing beyond 8 terms", () => {
    const bad = { ...valid, keywords: Array.from({ length: 9 }, (_, i) => `kw${i}`) };
    expect(SeoRewriteSchema.safeParse(bad).success).toBe(false);
  });
});

describe("formatSeoRewrite", () => {
  it("appends the target keywords so the user can see what it aimed at", () => {
    const out = formatSeoRewrite({ keywords: ["a", "b"], title: "T", body: "B", notes: "N" });
    expect(out).toBe("T\n\nB\n\n---\nTarget keywords: a, b\n\nEditor's notes: N");
  });
});

describe("EmailDigestSchema", () => {
  const valid = { subject: "S", preview: "P", body: "B", notes: "N" };

  it("accepts a valid digest", () => {
    expect(EmailDigestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a digest with no subject field", () => {
    const { subject: _s, ...rest } = valid;
    expect(EmailDigestSchema.safeParse(rest).success).toBe(false);
  });
});

describe("formatEmailDigest", () => {
  it("labels subject and preview so the artifact is pasteable into any ESP", () => {
    expect(formatEmailDigest({ subject: "S", preview: "P", body: "B", notes: "N" })).toBe(
      "Subject: S\n\nPreview: P\n\nB\n\n---\nBefore sending: N",
    );
  });
});

describe("UtmPlanSchema", () => {
  const valid = {
    source: "reddit",
    medium: "social",
    content: "r_freelance-painpoint",
    watch: "Signups tagged utm_content=r_freelance-painpoint over the week after posting.",
  };

  it("accepts a valid plan", () => {
    expect(UtmPlanSchema.safeParse(valid).success).toBe(true);
  });

  // The regex is the guard that stops analytics tools splitting one link across buckets.
  it("rejects spaces and capitals, which silently fragment attribution", () => {
    expect(UtmPlanSchema.safeParse({ ...valid, source: "Indie Hackers" }).success).toBe(false);
    expect(UtmPlanSchema.safeParse({ ...valid, medium: "Social" }).success).toBe(false);
  });

  // utm_campaign is derived in code, so the model can't sample a different slug per run.
  it("does not ask the model for utm_campaign at all", () => {
    expect("campaign" in UtmPlanSchema.shape).toBe(false);
  });

  it("rejects a value that would need url-encoding", () => {
    expect(UtmPlanSchema.safeParse({ ...valid, content: "post?v=1&x" }).success).toBe(false);
  });
});

describe("campaignSlug", () => {
  // Every link in one campaign must share utm_campaign or the report splits in two.
  it("is stable and url-safe for the same campaign name", () => {
    expect(campaignSlug("LedgerLite")).toBe("ledgerlite");
    expect(campaignSlug("Indie Hackers — Freelancers group")).toBe("indie-hackers-freelancers-group");
    expect(campaignSlug("LedgerLite")).toBe(campaignSlug("LedgerLite"));
  });

  it("never returns an empty slug", () => {
    expect(campaignSlug("!!!")).toBe("campaign");
  });
});

describe("formatUtm", () => {
  const plan = {
    source: "reddit",
    medium: "social",
    content: "painpoint-post",
    watch: "Tagged signups.",
  };

  it("assembles the query in a fixed order with an unmissable url placeholder", () => {
    const out = formatUtm(plan, "ledgerlite");
    expect(out.startsWith(`${URL_PLACEHOLDER}?utm_source=reddit&utm_medium=social`)).toBe(true);
    expect(out).toContain("utm_campaign=ledgerlite&utm_content=painpoint-post");
  });

  it("never emits a real domain — the user supplies it", () => {
    expect(formatUtm(plan, "ledgerlite")).toContain("GrowthOS doesn't know your URL");
  });

  // The '?' is hard-coded, so a landing page that already has a query string would swallow
  // utm_source unless the note tells the user to join with '&'.
  it("warns about a landing page that already has a query string", () => {
    expect(formatUtm(plan, "ledgerlite")).toContain('change the "?" before utm_source to "&"');
  });
});

describe("LaunchTimingSchema", () => {
  const valid = {
    window: "Tuesday 08:00–10:00",
    timezone: "US Eastern",
    confidence: "medium" as const,
    reasoning: "r/freelance peaks on weekday mornings.",
    checklist: ["Draft ready", "Reply for the first hour"],
  };

  it("accepts valid timing", () => {
    expect(LaunchTimingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a one-item checklist", () => {
    expect(LaunchTimingSchema.safeParse({ ...valid, checklist: ["only one"] }).success).toBe(false);
  });

  it("rejects an unknown confidence", () => {
    expect(LaunchTimingSchema.safeParse({ ...valid, confidence: "certain" }).success).toBe(false);
  });
});

describe("formatTiming", () => {
  // A model really did emit a literal \r inside `window`, which reached the artifact's
  // headline as a broken line. These agents don't retry (web search is paid), so the
  // formatter normalises rather than rejects.
  it("strips a control character a model emitted mid-window", () => {
    const out = formatTiming({
      window: "Tuesday\r08:00-10:00",
      timezone: "US\nEastern",
      confidence: "low",
      reasoning: "r",
      checklist: ["a", "b"],
    });
    expect(out).toContain("Post: Tuesday 08:00-10:00 (US Eastern)");
    expect(/[\u0000-\u001F]/.test(out.split("\n")[0])).toBe(false);
  });

  it("states plainly that nothing is published for you", () => {
    const out = formatTiming({
      window: "Tue 08:00",
      timezone: "US Eastern",
      confidence: "low",
      reasoning: "General heuristic — could not verify.",
      checklist: ["a", "b"],
    });
    expect(out).toContain("Post: Tue 08:00 (US Eastern)");
    expect(out).toContain("GrowthOS doesn't publish anything");
  });
});
