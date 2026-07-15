-- v2 "Full Dave Flow": Campaign -> Goal / Channel -> Plan -> Todo.
-- v1 tables are dropped (0 rows in production, per spec).
-- Deviation from spec sketch: goals also stores kpis[] + validation_note so the
-- review screen stays resumable from the database alone.
drop table if exists todos cascade;
drop table if exists channels cascade;
drop table if exists campaigns cascade;

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'researching', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaigns_user_id_idx on campaigns(user_id);

create table goals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references campaigns(id) on delete cascade,
  objective text not null,
  target_metric text not null default '',
  target_value text not null default '',
  timeframe text not null default '',
  success_definition text not null default '',
  audience text not null default '',
  kpis text[] not null default '{}',
  validation_note text
);

create table channels (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  platform text not null default '',
  type text not null default '',
  reason text not null default '',
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  selected boolean not null default false
);
create index channels_campaign_id_idx on channels(campaign_id);

create table plans (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  title text not null,
  objective text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  generated_by_ai boolean not null default true
);
create index plans_campaign_id_idx on plans(campaign_id);
create index plans_channel_id_idx on plans(channel_id);

create table todos (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  plan_id uuid not null references plans(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  estimated_time text,
  output text,
  due_date date,
  created_at timestamptz not null default now()
);
create index todos_campaign_id_idx on todos(campaign_id);
create index todos_plan_id_idx on todos(plan_id);

alter table campaigns enable row level security;
alter table goals enable row level security;
alter table channels enable row level security;
alter table plans enable row level security;
alter table todos enable row level security;

create policy "own campaigns" on campaigns
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own goals" on goals
  for all to authenticated
  using (exists (select 1 from campaigns c where c.id = goals.campaign_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from campaigns c where c.id = goals.campaign_id and c.user_id = (select auth.uid())));

create policy "own channels" on channels
  for all to authenticated
  using (exists (select 1 from campaigns c where c.id = channels.campaign_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from campaigns c where c.id = channels.campaign_id and c.user_id = (select auth.uid())));

create policy "own plans" on plans
  for all to authenticated
  using (exists (select 1 from campaigns c where c.id = plans.campaign_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from campaigns c where c.id = plans.campaign_id and c.user_id = (select auth.uid())));

create policy "own todos" on todos
  for all to authenticated
  using (exists (select 1 from campaigns c where c.id = todos.campaign_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from campaigns c where c.id = todos.campaign_id and c.user_id = (select auth.uid())));
