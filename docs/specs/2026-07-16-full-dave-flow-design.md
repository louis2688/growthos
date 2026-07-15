# GrowthOS v2 — Full Dave Flow

**Date:** 2026-07-16
**Status:** Draft — awaiting approval
**Supersedes the core loop of:** `docs/specs/2026-07-15-growthos-v1-design.md`
**Product reference:** `docs/05-domain-model.md`, `docs/08-user-flows.md`, `docs/10-ai-agent-specifications.md`

## What changes and why

v1 generates a campaign from one AI call: the model picks platform-level channels
(TikTok, Reddit) and hangs todos straight off them. Dave's docs describe a richer
flow: the AI researches **specific** places (r/personalfinance, not "Reddit"),
**the user chooses** which to pursue, and each chosen channel gets a **Plan** that
owns its todos. This spec adopts that flow in full.

Three decisions taken up front:
- **Channel research uses live web search** (Anthropic's `web_search` server tool) so
  recommended communities are real and current, not recalled from training data.
- **The Tool catalog ships seeded** with ~20 curated entries; the AI recommends from
  it rather than inventing names.
- **Two phases**, each shippable on its own.

## Data model

Dave's `05-domain-model.md` has both `Campaign.goal_id` and `Goal.campaign_id` —
circular. Resolved: **Goal holds `campaign_id`**, one goal per campaign.

```
campaigns
  id, user_id, name, description, status, created_at, updated_at
  status: draft | researching | active | archived      -- draft/researching drive the wizard

goals
  id, campaign_id (unique), objective, target_metric, target_value,
  timeframe, success_definition, audience

channels
  id, campaign_id, name, platform, type, reason, confidence, selected

plans                                    -- NEW layer
  id, campaign_id, channel_id, title, objective, status, priority, generated_by_ai

todos
  id, campaign_id, plan_id, title, description, status, priority,
  tool_id (fk, nullable), estimated_time, output, due_date, created_at
                                         -- channel_id is replaced by plan_id

tools                                    -- NEW, global catalog (not per-campaign)
  id, name, category, description, integration_type, status, created_at, updated_at

plan_tools                               -- NEW join
  id, plan_id, tool_id, reason, generated_by_ai
```

- `campaigns.title/goal/product_*/audience/budget` from v1 collapse into
  `campaigns.name/description` + the `goals` row.
- `todos.campaign_id` is kept (denormalized) so dashboard queries and RLS stay cheap.
- RLS: campaigns/goals/channels/plans/todos are owner-scoped via `campaigns.user_id`,
  exactly as v1 does today. `tools` is a **global read-only catalog** — readable by any
  authenticated user, writable only by the service role. `plan_tools` inherits ownership
  through its plan.
- **The v1 tables are dropped and rebuilt.** The database holds 0 campaigns, so there is
  no migration path to preserve and none is written.

## AI pipeline (4 calls)

Per `10-ai-agent-specifications.md`. Each agent is its own module under `lib/agents/`,
each with a Zod schema, each independently testable.

| # | Agent | Input | Output | Model / tools |
|---|---|---|---|---|
| 1 | Goal Analyzer | product name/description, raw goal | objective, target_metric, target_value, timeframe, success_definition, audience, suggested KPIs, validation note | `claude-opus-4-8`, no tools |
| 2 | Channel Research | goal + audience | 6–10 specific channels: name, platform, type, reason, confidence | `claude-opus-4-8` + `web_search_20260209` |
| 3 | Campaign Generator | goal + **selected** channels | one Plan per channel (title, objective, priority) + 3–8 todos per plan | `claude-opus-4-8`, no tools |
| 4 | Tool Recommender *(phase 2)* | plan + its todos + tool catalog | suggested tools per plan with reason + confidence; optional `tool_id` per todo | `claude-opus-4-8`, no tools |

Cost: roughly $1–2 per campaign (v1 was ~$0.20–0.50). Web search adds ~1–2 min.

## User flow

```
/new                    product + goal            → creates campaign(draft) + goal
   ↓ Goal Analyzer
/campaigns/[id]/review  shows analysis + KPIs     → user confirms or edits
   ↓ Channel Research (web search)
/campaigns/[id]/channels  6–10 cards w/ reasons   → user checks the ones to pursue
   ↓ Campaign Generator
/campaigns/[id]         dashboard                 → campaign(active)
```

The wizard is **resumable**: state lives in the database (`campaigns.status` +
`channels.selected`), not in session memory. Closing the tab mid-flow and returning
to `/campaigns/[id]` routes back to the right step.

Long AI steps render a progress state; each step's server action has
`maxDuration = 300`.

## Screens

1. **`/new`** — product name, what it does, goal (with timeframe). Audience is *derived*
   by the Goal Analyzer, so it is no longer asked.
2. **`/campaigns/[id]/review`** — the analysis: objective, metric, target, timeframe,
   audience, suggested KPIs, plus any validation warning ("100k users in 7 days is
   unrealistic for…"). Editable before continuing.
3. **`/campaigns/[id]/channels`** — channel cards: name, platform badge, type, why it
   fits, confidence. Checkboxes; select 2–6; "Generate campaign".
4. **`/campaigns/[id]`** — dashboard grouped by **Plan**: plan header (title, objective,
   priority, progress) with its todos nested. Channel filter tabs remain, driven through
   plan → channel. Right rail keeps progress ring + per-channel bars + next up.
5. **`/toolbox`** *(phase 2)* — the catalog: category filter, search, tool cards.

## Phases

**Phase 1 — the flow.** Schema (minus tools/plan_tools), agents 1–3, the three wizard
screens, dashboard rework to plan grouping, regenerate updated. Ships as a complete,
usable product.

**Phase 2 — the toolbox.** `tools` + `plan_tools` tables, seed ~20 curated entries,
agent 4, tool chips on todos/plans, `/toolbox` page.

## Error handling

- Any agent returning invalid JSON → retry once, then a friendly error that preserves
  the wizard step (same contract as v1).
- Web search finding nothing usable → fall back to platform-level channels and say so
  on the channel screen.
- Insert failures leave no partial campaign: a failed step deletes the campaign row
  (cascade removes children), same cleanup-on-failure pattern as v1.
- Anthropic billing/rate errors are re-thrown, not retried.

## Testing

Per agent: Zod schema accepts a valid payload and rejects malformed ones (the v1
pattern, which caught real bugs). Plus one test that the wizard router maps
`campaigns.status` to the correct step. UI stays untested.

## Success criteria

- Enter "Get my AI budgeting app to 100 users" → analysis names a plausible audience
  and KPIs → channel screen lists real, checkable communities with reasons → selecting
  3 produces 3 Plans with 3–8 todos each → dashboard groups todos under their plan.
- Closing the tab mid-wizard and reopening `/campaigns/[id]` resumes at the right step.
- A second user cannot see any of it (RLS, unchanged from v1).

## Explicitly out of scope

AI executing todos, analytics, agent marketplace, teams/collaboration, billing,
notifications, `Activity` feed.
