-- Observability. Every agent call is a paid, slow, occasionally-failing network call, and
-- until now a failure left nothing behind but a console.error on an ephemeral serverless
-- instance. Twice during development an agent failed and there was no way to tell why, or
-- even how long it ran. This is the trace.
--
-- Deliberately not a general-purpose log: one row per agent call, scoped to the campaign it
-- belongs to, so it inherits the same owner-scoped RLS as everything else and a user can
-- only ever see their own runs.
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  -- Set for tool runs (runTodoTool); null for the pipeline agents that build the campaign.
  todo_id uuid references todos(id) on delete set null,
  agent text not null,
  status text not null default 'running' check (status in ('running', 'ok', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  error text,
  created_at timestamptz not null default now()
);

-- The two questions worth asking: "what happened in this campaign?" and "what's failing?"
create index agent_runs_campaign_id_idx on agent_runs(campaign_id, started_at desc);
create index agent_runs_failures_idx on agent_runs(status, started_at desc) where status = 'failed';

alter table agent_runs enable row level security;

create policy "own agent_runs" on agent_runs
  for all to authenticated
  using (exists (select 1 from campaigns c where c.id = agent_runs.campaign_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from campaigns c where c.id = agent_runs.campaign_id and c.user_id = (select auth.uid())));
