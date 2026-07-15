# GrowthOS v1 — Design Spec

**Date:** 2026-07-15
**Status:** Approved by Louis

## One sentence

A web app where a founder fills in a short intake about their product and goal, and AI generates a growth campaign — channels, prioritized todos, and tool recommendations — which they manage on a filterable dashboard.

## Context & vision

GrowthOS is an AI Growth Operating System. Long-term: users state a business goal ("I want 10,000 users") and AI plans and executes the growth work — with AI content execution, analytics, an agent marketplace, teams, and billing. v1 builds only the core loop that proves the magic moment: **goal in → campaign out**.

## v1 scope

**In:** structured intake → AI campaign generation → campaign dashboard with channel-filterable todos, manual todo management, regenerate.

**Out (deferred to v2+):** auth & multi-user, billing/freemium tiers, AI content execution, analytics, agent marketplace, teams/workspaces, public landing page.

## Stack

- **App:** Next.js (App Router, TypeScript, Tailwind CSS, shadcn/ui)
- **Database:** Supabase Postgres (accessed from server routes only)
- **AI:** Claude API (structured JSON output)
- **Deploy:** Vercel
- **Access control:** none in-app for v1 (single user). Deployed app is protected with Vercel deployment protection so strangers can't burn API credits.

## Data model

Three tables. No Tool table in v1 — the tool recommendation is a plain-text field on the todo; promote it to a table when tools become real (marketplace/execution).

```
campaigns
  id                  uuid pk
  title               text
  goal                text
  status              text  ('active' | 'archived')
  product_name        text
  product_description text
  audience            text
  budget              text nullable
  created_at          timestamptz

channels
  id          uuid pk
  campaign_id uuid fk -> campaigns (on delete cascade)
  name        text

todos
  id          uuid pk
  campaign_id uuid fk -> campaigns (on delete cascade)
  channel_id  uuid fk -> channels (on delete cascade)
  title       text
  description text
  status      text  ('todo' | 'in_progress' | 'done')
  priority    text  ('high' | 'medium' | 'low')
  tool        text nullable   -- e.g. "Video Generator"
  due_date    date nullable
  created_at  timestamptz
```

## Screens

1. **Campaigns list (`/`)** — campaign cards showing title, goal, and progress % (done todos / total). "New Campaign" button.
2. **New campaign intake (`/new`)** — one form: product name, what it does, target audience, goal (including timeframe, e.g. "10,000 users in 90 days"), optional budget. Submit → loading state while AI generates → redirect to dashboard.
3. **Campaign dashboard (`/campaigns/[id]`)** — goal header with progress, channel filter tabs (All + each channel), todo list with status checkboxes, priority badges, tool chips, due dates. Click a todo to edit any field. Add todos manually. "Regenerate" action re-runs AI generation for the campaign; after an explicit confirmation it replaces **all** channels and todos (including manually added ones — v1 does not track which todos were AI-generated).

## AI generation flow

One server route: `POST /api/campaigns/generate`

1. Receives intake fields.
2. Calls Claude with a prompt that includes the intake and the curated channel list, requesting structured JSON: `{ title, channels: [3–5 names], todos: [15–30 of { title, description, channel, priority, tool, due_in_days? }] }`. `due_in_days` is converted to a concrete `due_date` (creation date + N days) at insert time.
3. Validates the response with a Zod schema.
4. Inserts campaign, channels, todos into Supabase — campaign row first, then children; if any child insert fails the campaign row is deleted (cascade removes children), so no partial campaign is ever visible.
5. Returns the campaign id; client redirects to the dashboard.

**Curated channel list (~12):** TikTok, Reddit, SEO, App Store, Product Hunt, LinkedIn, X (Twitter), YouTube, Email, Influencers, Google Ads, Facebook Ads. The AI must choose from this list so the UI stays predictable.

## Error handling

- Malformed/invalid AI JSON → retry once; on second failure show a friendly error and preserve the intake form values.
- Supabase insert failure → no partial campaigns (cleanup-on-failure: delete the campaign row, cascade removes children); surface error to the user.

## Testing

One test on the critical path: the generation route's parsing/validation — Zod schema accepts a valid AI payload and rejects malformed ones. UI is untested in v1.

## Success criteria

- Fill in the intake for a real product → get a coherent campaign with 3–5 relevant channels and 15–30 actionable todos in under ~60 seconds.
- Filter todos by channel, change status/priority, add and edit todos manually.
- Deployed on Vercel, data persisted in Supabase.
