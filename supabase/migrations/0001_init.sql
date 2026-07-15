create table campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  goal text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  product_name text not null,
  product_description text not null,
  audience text not null,
  budget text,
  created_at timestamptz not null default now()
);

create table channels (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null
);

create table todos (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  tool text,
  due_date date,
  created_at timestamptz not null default now()
);

-- No policies: only the service-role key (which bypasses RLS) touches these tables.
alter table campaigns enable row level security;
alter table channels enable row level security;
alter table todos enable row level security;
