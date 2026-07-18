-- Rate-limit rows include client IPs (personal data) and are only meaningful for the current
-- day. Retain 7 days for abuse forensics, then purge opportunistically on the next bump — the
-- table stays tiny and the privacy policy's retention claim holds without needing a scheduler.
create or replace function bump_rate_limit(p_bucket text, p_day date)
returns integer
language sql
as $$
  delete from tool_rate_limit where day < p_day - 7;
  insert into tool_rate_limit (bucket, day, count)
  values (p_bucket, p_day, 1)
  on conflict (bucket, day) do update set count = tool_rate_limit.count + 1
  returning count;
$$;
