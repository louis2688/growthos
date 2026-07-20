-- The last three catalog-only tools become executable — NARROWED, like 0009, to what they
-- can honestly do, with descriptions rewritten to match.
--
-- Dave's toolbox.html promised automation we cannot and should not deliver:
--   "Sends templated DMs to warm leads" — nothing here can (or should) send messages as the
--   user; template-blasting DMs is exactly what gets accounts banned and communities salted.
--   "Monitors competitor launches" — there is no background job; nothing watches anything
--   between clicks.
--   "Schedules and manages a Product Hunt launch end-to-end via the PH API" — no PH OAuth,
--   and PH launches are done by the maker on producthunt.com.
-- Each keeps the genuinely useful half: drafting the one personalized message the user sends
-- by hand, a live-searched snapshot of the competitive field, and the launch kit (tagline,
-- listing copy, maker comment, day-one checklist) the maker pastes in.
--
-- integration_type flips to 'internal': all three now run on our own agents, and the old
-- 'api' label would render "API integration" on the card — a claim about a connection that
-- doesn't exist.

update tools
set handler = 'outreach_writer',
    integration_type = 'internal',
    status = 'beta',
    description = 'Drafts one personalized outreach message per task — you fill the personal details and send it yourself.'
where name = 'Outreach Bot';

update tools
set handler = 'competitor_scan',
    integration_type = 'internal',
    status = 'beta',
    description = 'Live-searches who competes for this audience on this channel and what they''re doing — a sourced snapshot, not continuous monitoring.'
where name = 'Competitor Watcher';

update tools
set handler = 'ph_launch_kit',
    integration_type = 'internal',
    description = 'Drafts your Product Hunt launch kit — tagline, listing copy, maker comment, day-one checklist. You launch it yourself.'
where name = 'Product Hunt Scheduler';

-- Stale plan_tools reasons (the 0009 problem): suggestions written before this migration
-- carry reasons generated from the OLD descriptions, rendered verbatim on the dashboard.
-- Outreach Bot and Competitor Watcher were seeded 'disabled' and the recommender never sees
-- disabled tools, so they have no rows. Product Hunt Scheduler was suggestible, so its rows
-- can still promise "end-to-end via the PH API" where the user plans work. 0009 removed its
-- stale rows out-of-band because they were enumerable by id; these aren't (any campaign
-- generated since could hold one), so this delete runs here — predicated on the one tool,
-- which is the narrowness 0009 was protecting. The next generate re-suggests it with an
-- honest reason.
delete from plan_tools
where tool_id in (select id from tools where name = 'Product Hunt Scheduler');
