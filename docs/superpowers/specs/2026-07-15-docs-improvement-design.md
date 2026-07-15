# GrowthOS Docs Improvement — Design

Date: 2026-07-15

## Context

`docs/` holds the product-owner spec set for GrowthOS (an AI campaign-planning
platform). The repo has no code yet — this is a pre-build planning stage.
`docs/README.md` self-tracks each file's completion status ("Drafted",
"Outline only", etc.). Several files are outlines with `TODO` markers, and
there are cross-file inconsistencies (entities named in one doc but never
defined in another).

Goal: bring the doc set to internal consistency and fill the content gaps,
distinguishing between changes that require no product judgment (mechanical)
and changes that involve making a call on product direction (strategic —
flagged as draft for review).

## Scope

### Batch 1 — Mechanical / consistency (no product judgment required)

- `02-prd.md`: fix the malformed link on line 35.
- `04-information-architecture.md`: add `Metrics` to the Objects list (it's
  in the exec summary and domain-model diagrams but missing from the IA
  object list).
- `11-api-specification.md`: expand the 6 sketched endpoints into full specs
  — request/response JSON bodies derived from the field lists already in
  `05-domain-model.md`, status codes, and an auth note (bearer token,
  workspace-scoped, matching the `Workspace`/`User` objects already named in
  the IA).
- `12-database-schema.md`: add column types and constraints to the 6
  entities that already have field lists (Campaign, Goal, Channel, Plan,
  Todo, Tool, Plan_Tool) — `id: uuid pk`, enums inferred from context
  (e.g. `status`), `timestamptz` for time fields, FK constraints, indexes on
  all FKs.
- `README.md`: refresh the status column after each batch lands.

### Batch 2 — Strategic / product content (best-effort draft, flagged for review)

Every addition in this batch gets a `> Draft — needs product review` callout
at the top, consistent with the doc set's existing "Outline only" / "Drafted"
convention.

- `02-prd.md`: fill all 10 TODO sections (problem statement, personas,
  goals, functional/non-functional requirements, risks) — derived from the
  executive summary, domain model, and user flows already in the doc set.
- `03-vision-strategy.md`: draft long-term vision and strategic bets.
  Competitive positioning stays generic (manual research, growth agencies,
  generic playbooks) — no named competitors, since there's no real market
  data to draw on.
- `05-domain-model.md` + `12-database-schema.md`: draft field lists for the
  entities that are named but never defined — `Agent`, `Workspace`, `User`,
  `Notification`, `Activity`.
- `06-user-stories-epics.md`: add the remaining 5 epics (Goal Analysis,
  Channel Recommendation, Plan Generation, Todo Execution,
  Dashboard/Analytics) in the existing Given/When/Then format.
- `07-feature-specifications.md`: add the remaining 5 feature specs in the
  existing Purpose/Inputs/Outputs format.
- `09-wireframes.md`: text/ASCII low-fi layouts for the 8 listed screens, no
  colors or branding, matching the file's existing note.
- `14-release-plan.md` (new): phased release plan derived from
  `13-mvp-roadmap.md`.
- `15-success-metrics-kpis.md` (new): KPI definitions tied to the
  Goal/Metrics entities already in the domain model.

## Out of scope

- Naming real competitors or citing external market data (no source for
  this exists in the repo or was provided).
- Visual/graphical wireframes (image files) — text-based low-fi layouts
  only, per the existing convention in `09-wireframes.md`.
- Any code — this is a docs-only change set.

## Sequencing

Batch 1 lands first (fast, unambiguous, immediately committable). Batch 2
follows as a second commit so the two kinds of change — "definitely correct"
vs. "best judgment call" — stay easy to distinguish in history and easy to
revert independently if the strategic drafts need rework.

## Verification

- Grep for entities/objects named in any doc to confirm they're now defined
  everywhere they're referenced (no more "named but undefined" objects).
- Confirm all internal markdown links resolve (including the new `14` and
  `15` files, and the fixed link in `02-prd.md`).
- Confirm `README.md`'s status table matches the actual state of each file
  after each batch.
