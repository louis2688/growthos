-- Multi-tenancy hardening. The "own plans"/"own todos" policies checked only that
-- campaign_id belongs to the caller — not that the row's OTHER foreign key
-- (plans.channel_id, todos.plan_id) sits in that same campaign. A tenant crafting
-- direct API calls could therefore insert a plan referencing another tenant's channel,
-- or a todo referencing another tenant's plan. The UI never does this (ids come from
-- the user's own data), but RLS shouldn't rely on the UI.
--
-- USING already enforces ownership via campaign_id, so only the write gate (WITH CHECK)
-- needs the secondary-FK clause. Requiring the referenced row to share this row's
-- (owner-verified) campaign_id transitively guarantees same-owner.

alter policy "own plans" on plans
  with check (
    exists (select 1 from campaigns c where c.id = plans.campaign_id and c.user_id = (select auth.uid()))
    and exists (select 1 from channels ch where ch.id = plans.channel_id and ch.campaign_id = plans.campaign_id)
  );

alter policy "own todos" on todos
  with check (
    exists (select 1 from campaigns c where c.id = todos.campaign_id and c.user_id = (select auth.uid()))
    and exists (select 1 from plans p where p.id = todos.plan_id and p.campaign_id = todos.campaign_id)
  );
