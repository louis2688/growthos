# GrowthOS by LaunchLift

AI Growth Operating System — describe your product and goal, and Claude
generates a growth campaign: 3–5 channels and 15–30 prioritized todos with
tool recommendations, managed on a channel-filterable dashboard.

## Stack

Next.js 16 (App Router) · Supabase Postgres · Anthropic Claude (`claude-opus-4-8`) · Vercel

## Setup

1. `nvm use` (Node 22 — supabase-js needs native WebSocket)
2. `npm install`
3. Create `.env.local`:

   ```
   ANTHROPIC_API_KEY=...
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

4. Apply `supabase/migrations/0001_init.sql` to your Supabase project.
5. `npm run dev`

## Tests

`npm test` — schemas, formatters and wizard routing. Fast, free, no network.

## Guardrail evals

`npm run evals` — checks that the agents refuse to lie.

GrowthOS writes copy people publish to real communities and email to real subscribers, so the
prompts carry rules the product depends on: don't invent milestones, don't restate a task title
as an achieved metric, disclose that you built the thing, don't invent a landing page URL, don't
claim to have posted anything. Those rules are only as good as something that checks them.

Each case feeds an agent an input designed to *tempt* the failure, then an adversarial judge
hunts for the violation (uncertainty counts as a violation — a false pass costs the user's
credibility, a false alarm costs a re-read).

Not part of `npm test`: it makes real, paid API calls and the agents are non-deterministic, so it
would be flaky and expensive as a CI gate. **Run it before shipping any change to an agent
prompt** — that's when a guardrail silently regresses.

    npm run evals           # all cases
    npm run evals email     # cases matching "email"

A failure is a real gap in what the product will publish on someone's behalf. Fix the prompt, not
the eval.

These have teeth: stripping the anti-fabrication rules out of the email prompt makes the model
write "We crossed 500 subscribers" and "We hit 50 paying customers" — inventing both numbers from
task *titles* — and both evals catch it.

## Docs

- Spec: `docs/specs/2026-07-15-growthos-v1-design.md`
- Plan: `docs/plans/2026-07-15-growthos-v1.md`
- Product reference (v2+ direction): `docs/01`–`docs/13`
