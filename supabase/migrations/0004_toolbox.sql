-- Phase 2 "Toolbox": global Tool catalog, Plan_Tool suggestions, Todo->Tool assignment.
-- Enums realigned to Dave's prototypes (campaign-kanban.html, campaign-plans.html):
--   todos.status  todo -> backlog, + review
--   plans.status  + planned
--   campaigns.status + reviewing (the plan-preview step in campaign-creation.html)

alter table todos drop constraint todos_status_check;
update todos set status = 'backlog' where status = 'todo';
alter table todos
  alter column status set default 'backlog',
  add constraint todos_status_check check (status in ('backlog', 'in_progress', 'review', 'done'));

alter table plans drop constraint plans_status_check;
alter table plans
  add constraint plans_status_check check (status in ('planned', 'active', 'archived'));

alter table campaigns drop constraint campaigns_status_check;
alter table campaigns
  add constraint campaigns_status_check
  check (status in ('draft', 'researching', 'reviewing', 'active', 'archived'));

-- Global catalog: not scoped to a campaign or a user (domain-model-uml.html).
create table tools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('ai', 'marketing', 'content', 'analytics', 'outreach')),
  description text not null default '',
  integration_type text not null check (integration_type in ('internal', 'api', 'link-out')),
  status text not null default 'active' check (status in ('active', 'beta', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AI suggests several Tools per Plan, each with a reason; a Tool spans many Plans.
create table plan_tools (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  tool_id uuid not null references tools(id) on delete cascade,
  reason text not null default '',
  generated_by_ai boolean not null default true,
  unique (plan_id, tool_id)
);
create index plan_tools_plan_id_idx on plan_tools(plan_id);

-- Optional single-tool assignment per Todo — a real FK, not free text.
alter table todos add column tool_id uuid references tools(id) on delete set null;
create index todos_tool_id_idx on todos(tool_id);

alter table tools enable row level security;
alter table plan_tools enable row level security;

-- The catalog is read-only to the app; rows are managed by migrations.
create policy "read tools" on tools for select to authenticated using (true);

create policy "own plan_tools" on plan_tools
  for all to authenticated
  using (exists (
    select 1 from plans p join campaigns c on c.id = p.campaign_id
    where p.id = plan_tools.plan_id and c.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from plans p join campaigns c on c.id = p.campaign_id
    where p.id = plan_tools.plan_id and c.user_id = (select auth.uid())
  ));

insert into tools (name, category, description, integration_type, status) values
  ('AI Post Writer', 'ai', 'Drafts platform-tuned posts — educational, launch, or build-in-public tone — from a Plan objective.', 'internal', 'active'),
  ('Image Generator', 'ai', 'Generates supporting graphics and gallery images for posts and launch pages.', 'internal', 'active'),
  ('Launch Scheduler', 'marketing', 'Times publish and launch events for peak traffic windows on each channel.', 'internal', 'active'),
  ('Analytics Tracker', 'analytics', 'Tracks CTR, signups, and referrals back to the Todo that drove them.', 'internal', 'active'),
  ('Product Hunt Scheduler', 'marketing', 'Schedules and manages a Product Hunt launch end-to-end via the PH API.', 'api', 'beta'),
  ('SEO Optimizer', 'content', 'Rewrites post copy for target keywords without losing platform tone.', 'internal', 'beta'),
  ('Outreach Bot', 'outreach', 'Sends templated DMs to warm leads collected from a campaign channel.', 'api', 'disabled'),
  ('Reddit Karma Checker', 'outreach', 'Flags accounts below the karma threshold before you post in a subreddit.', 'link-out', 'active'),
  ('Email Digest Composer', 'content', 'Turns campaign milestones into a subscriber-ready email draft.', 'internal', 'beta'),
  ('Competitor Watcher', 'analytics', 'Monitors competitor launches on the same channels your campaign is active on.', 'api', 'disabled');
