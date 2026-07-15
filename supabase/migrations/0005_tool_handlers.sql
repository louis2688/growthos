-- Phase 3: make catalog tools executable.
--
-- `handler` is the app's dispatch key: null means the tool is catalog-only (Dave's
-- prototypes list tools we haven't built), a value names the agent that runs it.
-- Adding a tool to the Toolbox no longer implies it does anything — this column is
-- the single source of truth for what can actually execute.
--
-- `url` backs the link-out integration type, which until now had nowhere to point.
alter table tools add column handler text;
alter table tools add column url text;

update tools set handler = 'post_writer' where name = 'AI Post Writer';
update tools set url = 'https://www.reddit.com/user/me' where name = 'Reddit Karma Checker';

-- todos.output now holds the artifact a tool run PRODUCES, not the campaign
-- generator's guess at what the artifact would be ("Draft Reddit post with subtle
-- CTA"). Those stale hints would render as if they were real drafts; the expected
-- output is already spelled out in todos.description. The two pre-existing test
-- campaigns were cleared by id out-of-band rather than with a table-wide update.
