-- Refund-on-fail (Dave + Louis, 2026-07-20): credits are deducted before the AI call and
-- returned if the run fails. Clamped at 0 so a refund can never mint credits. The daily rate
-- limits still count failed attempts, so forced failures stay bounded without the charge.
create function refund_credits(p_user_id uuid, p_month text, p_cost integer)
returns void
language sql
as $$
  update credit_usage
    set spent = greatest(0, spent - p_cost)
    where user_id = p_user_id and month = p_month;
$$;

revoke all on function refund_credits(uuid, text, integer) from public;
grant execute on function refund_credits(uuid, text, integer) to service_role;
