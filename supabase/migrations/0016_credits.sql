-- Monthly AI credit wallet (task #57, schedule agreed with Dave). One row per (user, month);
-- the allowance is code-side so tier changes never need a migration. Service-role only, same
-- posture as tool_rate_limit: RLS on with NO policies is a hard deny for anon/authenticated.
create table credit_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  spent integer not null default 0,
  primary key (user_id, month)
);

alter table credit_usage enable row level security;

-- Atomic spend-if-affordable: the row lock makes concurrent spends serialize, so two requests
-- can't both read N and slip past the allowance. Returns credits remaining, or -1 if the spend
-- would exceed the allowance (nothing is charged in that case).
create function spend_credits(p_user_id uuid, p_month text, p_cost integer, p_allowance integer)
returns integer
language plpgsql
as $$
declare
  v_spent integer;
begin
  if p_cost > p_allowance then
    return -1;
  end if;

  insert into credit_usage (user_id, month, spent)
  values (p_user_id, p_month, p_cost)
  on conflict (user_id, month) do update
    set spent = credit_usage.spent + p_cost
    where credit_usage.spent + p_cost <= p_allowance
  returning spent into v_spent;

  if v_spent is null then
    return -1;
  end if;
  return p_allowance - v_spent;
end;
$$;

revoke all on function spend_credits(uuid, text, integer, integer) from public;
grant execute on function spend_credits(uuid, text, integer, integer) to service_role;
