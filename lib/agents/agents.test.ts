import { describe, expect, it } from "vitest";
import { GoalAnalysisSchema } from "./goal-analyzer";
import { ChannelResearchSchema } from "./channel-research";
import { buildQueries, pickUrls } from "./cheap-research";
import { CampaignPlanSchema } from "./campaign-generator";
import { ToolRecommendationSchema, recommendTools } from "./tool-recommender";
import { PostDraftSchema, formatDraft } from "./post-writer";
import { SeoRewriteSchema, formatSeoRewrite } from "./seo-optimizer";
import { EmailDigestSchema, formatEmailDigest } from "./email-digest";
import {
  UtmPlanSchema,
  buildUtm,
  campaignSlug,
  formatUtm,
  mediumFor,
  URL_PLACEHOLDER,
} from "./utm-builder";
import { LaunchTimingSchema, formatTiming } from "./launch-timing";
import { OutreachDraftSchema, formatOutreach } from "./outreach-writer";
import { CompetitorScanSchema, formatCompetitorScan } from "./competitor-scan";
import { PhLaunchKitSchema, formatLaunchKit } from "./ph-launch-kit";

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

describe("cheap research pipeline (pure parts)", () => {
  const input = {
    productName: "LedgerLite",
    productDescription: "Simple bookkeeping for freelancers who hate spreadsheets and taxes",
    goal: {
      objective: "Acquire users",
      target_metric: "signups",
      target_value: "500",
      timeframe: "60 days",
      audience: "freelance designers and developers in the US",
    },
  };

  it("builds queries that carry the audience and product, bounded in length", () => {
    const queries = buildQueries(input);
    expect(queries.length).toBe(3);
    expect(queries[0]).toContain("freelance designers");
    expect(queries.every((q) => q.split(/\s+/).length < 20)).toBe(true);
  });

  it("picks urls with dedupe, junk filtering, and a per-host cap that still allows subreddits", () => {
    const r = (link: string) => ({ title: "t", link, snippet: "s" });
    const picked = pickUrls([
      r("https://www.reddit.com/r/freelance/"),
      r("https://www.reddit.com/r/freelance/"), // exact dupe
      r("https://www.reddit.com/r/web_design/"),
      r("https://www.reddit.com/r/smallbusiness/"),
      r("https://www.reddit.com/r/Entrepreneur/"), // 4th reddit — over per-host cap
      r("https://www.pinterest.com/board/x"), // junk host
      r("not a url"),
      r("https://indiehackers.com/group/freelancers"),
    ]);
    expect(picked).toEqual([
      "https://www.reddit.com/r/freelance/",
      "https://www.reddit.com/r/web_design/",
      "https://www.reddit.com/r/smallbusiness/",
      "https://indiehackers.com/group/freelancers",
    ]);
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

describe("buildUtm (pure code — no AI, the free tool)", () => {
  const input = {
    channel: { name: "r/freelance", platform: "Reddit", type: "community" },
    todo: { title: "Post the pain-point thread", description: "..." },
    campaign: "ledgerlite",
  };

  it("derives url-safe values that satisfy the schema, deterministically", () => {
    const a = buildUtm(input);
    expect(UtmPlanSchema.safeParse(a).success).toBe(true);
    expect(a).toEqual(buildUtm(input)); // same input, same link — no sampling
    expect(a.source).toBe("reddit");
    expect(a.content).toBe("post-the-pain-point-thread");
  });

  it("maps channel context to a conventional medium with referral as the fallback", () => {
    expect(mediumFor("community", "Reddit")).toBe("social");
    expect(mediumFor("newsletter", "Substack")).toBe("email");
    expect(mediumFor("blog", "Medium")).toBe("organic");
    expect(mediumFor("directory", "BetaList")).toBe("referral");
  });

  it("does not mis-bucket paid, publication-name, or research channels as organic", () => {
    expect(mediumFor("paid search", "Google Ads")).toBe("cpc");
    expect(mediumFor("publication", "Search Engine Journal")).toBe("referral");
    expect(mediumFor("community", "ResearchGate")).toBe("social");
  });

  it("concatenates utm_source like the old agent convention, so old links keep aggregating", () => {
    const plan = buildUtm({
      channel: { name: "IH freelancers", platform: "Indie Hackers", type: "community" },
      todo: { title: "Intro post", description: "" },
      campaign: "ledgerlite",
    });
    expect(plan.source).toBe("indiehackers");
  });

  it("never emits an empty value, even for garbage input", () => {
    const plan = buildUtm({
      channel: { name: "??", platform: "!!!", type: "" },
      todo: { title: "***", description: "" },
      campaign: "campaign",
    });
    expect(UtmPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("names the content tag in the watch note without promising numbers", () => {
    const plan = buildUtm(input);
    expect(plan.watch).toContain(`utm_content=${plan.content}`);
    expect(plan.watch).not.toMatch(/\d+%|\d+ signups/);
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

describe("OutreachDraftSchema", () => {
  const valid = {
    who: "Freelancers active in r/freelance threads about invoicing pain",
    subject: "Your invoicing thread",
    message: "Saw [the thread where they mentioned this] — I built LedgerLite for exactly that.",
    notes: "r/freelance tolerates DMs only after public interaction; reply in-thread first.",
  };

  it("accepts a valid draft", () => {
    expect(OutreachDraftSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an empty subject — DMs on most platforms have none", () => {
    expect(OutreachDraftSchema.safeParse({ ...valid, subject: "" }).success).toBe(true);
  });

  it("rejects a draft missing the message", () => {
    const { message: _m, ...rest } = valid;
    expect(OutreachDraftSchema.safeParse(rest).success).toBe(false);
  });
});

describe("formatOutreach", () => {
  const draft = {
    who: "W",
    subject: "S",
    message: "M with [their detail]",
    notes: "N",
  };

  it("labels every section and keeps the one-at-a-time framing", () => {
    const out = formatOutreach(draft);
    expect(out).toContain("Who to contact: W");
    expect(out).toContain("Subject: S");
    expect(out).toContain("Before you send: N");
    expect(out).toContain("one person at a time");
    expect(out).toContain("GrowthOS doesn't send anything");
  });

  it("omits an empty subject and empty notes", () => {
    const out = formatOutreach({ ...draft, subject: "", notes: "" });
    expect(out).not.toContain("Subject:");
    expect(out).not.toContain("Before you send:");
  });
});

describe("CompetitorScanSchema", () => {
  const valid = {
    summary: "Two bookkeeping tools actively post in this subreddit.",
    competitors: [
      {
        name: "BooksEasy",
        what: "Bookkeeping for solo founders.",
        presence: "Weekly value posts in r/freelance; launched on PH last month.",
        source_url: "https://www.reddit.com/r/freelance/comments/abc",
      },
    ],
    takeaways: ["Lead with tax-season pain, which neither competitor touches.", "Avoid launch-week overlap."],
  };

  it("accepts a valid scan", () => {
    expect(CompetitorScanSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an empty competitor list — an honest quiet channel is a valid result", () => {
    expect(CompetitorScanSchema.safeParse({ ...valid, competitors: [] }).success).toBe(true);
  });

  it("rejects a single takeaway", () => {
    expect(CompetitorScanSchema.safeParse({ ...valid, takeaways: ["only one"] }).success).toBe(false);
  });

  it("rejects more than five competitors", () => {
    const bad = { ...valid, competitors: Array.from({ length: 6 }, () => valid.competitors[0]) };
    expect(CompetitorScanSchema.safeParse(bad).success).toBe(false);
  });
});

describe("formatCompetitorScan", () => {
  const scan = {
    summary: "Sum.",
    competitors: [
      { name: "A", what: "does a", presence: "posts weekly", source_url: "https://x.test/a" },
      { name: "B", what: "does b", presence: "quiet here", source_url: "" },
    ],
    takeaways: ["t1", "t2"],
  };

  it("lists competitors with sources and says it is a snapshot, not monitoring", () => {
    const out = formatCompetitorScan(scan);
    expect(out).toContain("- A — does a");
    expect(out).toContain("Seen at: https://x.test/a");
    expect(out).toContain("What to do with this:");
    expect(out).toContain("GrowthOS doesn't keep monitoring");
  });

  it("omits the source line when the model saw no URL", () => {
    const out = formatCompetitorScan(scan);
    const bLine = out.split("- B — does b")[1];
    expect(bLine).not.toContain("Seen at:");
  });

  // Same failure mode formatTiming guards: a control character in a list header breaks the
  // artifact's line structure.
  it("strips control characters from the competitor header", () => {
    const out = formatCompetitorScan({
      ...scan,
      competitors: [{ name: "A\rCo", what: "w", presence: "p", source_url: "" }],
    });
    expect(out).toContain("- A Co — w");
  });
});

describe("PhLaunchKitSchema", () => {
  const valid = {
    tagline: "Bookkeeping that does itself",
    listing: "LedgerLite reconciles freelance income automatically.",
    maker_comment: "I built this because tax season broke me. What would make you trust it?",
    checklist: ["Gallery images exported", "Launch at 12:01am PT", "Reply to every comment", "Share for feedback"],
    notes: "Never ask for upvotes — PH flags vote solicitation.",
  };

  it("accepts a valid kit", () => {
    expect(PhLaunchKitSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a tagline over the hard cap", () => {
    expect(PhLaunchKitSchema.safeParse({ ...valid, tagline: "x".repeat(81) }).success).toBe(false);
  });

  it("rejects a checklist that is too short to run a launch day", () => {
    expect(PhLaunchKitSchema.safeParse({ ...valid, checklist: ["a", "b", "c"] }).success).toBe(false);
  });
});

describe("formatLaunchKit", () => {
  it("labels every asset and says the maker launches it themselves", () => {
    const out = formatLaunchKit({
      tagline: "T",
      listing: "L",
      maker_comment: "M",
      checklist: ["a", "b", "c", "d"],
      notes: "N",
    });
    expect(out).toContain("Tagline: T");
    expect(out).toContain("Listing description:\nL");
    expect(out).toContain("First maker comment:\nM");
    expect(out).toContain("Launch day:");
    expect(out).toContain("GrowthOS doesn't schedule or publish anything");
  });
});
