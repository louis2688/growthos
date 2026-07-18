-- Durable daily rate limit for the public, unauthenticated tools (e.g. the Subreddit Finder),
-- which call a paid, web-searching agent. One row per (bucket, day): bucket is "GLOBAL" for the
-- day's overall ceiling, or "ip:<addr>" for a single visitor. Only the service-role client
-- writes here (callers are anonymous), so RLS is on with NO policies — a hard deny for
-- anon/authenticated, bypassed only by the service role.
create table tool_rate_limit (
  bucket text not null,
  day date not null,
  count integer not null default 0,
  primary key (bucket, day)
);

alter table tool_rate_limit enable row level security;

-- Atomic increment-and-return: two concurrent requests can't both read N and write N+1 and slip
-- past the cap. A single INSERT ... ON CONFLICT ... RETURNING is atomic under the row lock.
create function bump_rate_limit(p_bucket text, p_day date)
returns integer
language sql
as $$
  insert into tool_rate_limit (bucket, day, count)
  values (p_bucket, p_day, 1)
  on conflict (bucket, day) do update set count = tool_rate_limit.count + 1
  returning count;
$$;

-- Only the service role may bump counters — the anon key must not be able to inflate them
-- (which would let anyone lock the tool for everyone).
revoke all on function bump_rate_limit(text, date) from public;
grant execute on function bump_rate_limit(text, date) to service_role;
