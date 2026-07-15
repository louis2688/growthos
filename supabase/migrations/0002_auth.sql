-- Per-user private campaigns: owner column + RLS so each user sees only their own.
alter table campaigns add column user_id uuid references auth.users(id) on delete cascade;
alter table campaigns alter column user_id set not null;
create index campaigns_user_id_idx on campaigns(user_id);

create policy "own campaigns" on campaigns
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own channels" on channels
  for all to authenticated
  using (exists (select 1 from campaigns c where c.id = channels.campaign_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from campaigns c where c.id = channels.campaign_id and c.user_id = (select auth.uid())));

create policy "own todos" on todos
  for all to authenticated
  using (exists (select 1 from campaigns c where c.id = todos.campaign_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from campaigns c where c.id = todos.campaign_id and c.user_id = (select auth.uid())));
