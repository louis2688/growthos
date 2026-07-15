# GrowthOS

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

`npm test` — validates the AI-output schema on the generation path.

## Docs

- Spec: `docs/specs/2026-07-15-growthos-v1-design.md`
- Plan: `docs/plans/2026-07-15-growthos-v1.md`
- Product reference (v2+ direction): `docs/01`–`docs/13`
