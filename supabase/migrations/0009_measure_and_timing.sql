-- Phase 5: two more catalog tools become executable — but NARROWED to what they can
-- honestly do, and their descriptions rewritten to match.
--
-- Dave's toolbox.html described capabilities we cannot deliver:
--   "Tracks CTR, signups, and referrals back to the Todo that drove them" — there is no
--   analytics pipeline and no access to the user's Reddit/Product Hunt/site numbers.
--   "Times publish and launch events for peak traffic windows" — nothing here can publish;
--   that needs per-platform APIs and the user's OAuth.
-- Each keeps the genuinely useful half: building the tagged link that MAKES attribution
-- possible, and recommending WHEN to post. The Toolbox is a promise to the user, so the
-- copy states the narrower truth rather than the prototype's ambition.
update tools
set handler = 'utm_builder',
    description = 'Builds the UTM-tagged link for this task so signups can be traced back to it, and tells you what to watch.'
where name = 'Analytics Tracker';

update tools
set handler = 'launch_timing',
    description = 'Researches when this channel is actually active and recommends a posting window. It advises — it does not publish.'
where name = 'Launch Scheduler';

-- Rewriting the catalog copy isn't enough. The Tool Recommender is PROMPTED with
-- tools.description and writes a per-plan `reason` from it, which plan_tools stores and the
-- dashboard renders next to the tool's name — and the corrected description is not shown on
-- that surface at all. So every reason written before this migration still makes the old
-- claim ("Tracks Reddit CTR and signups...", "Times the post to publish...") exactly where
-- the user plans their work. The next generate rewrites them from the honest description,
-- and a suggestion with no reason is noise, so the stale rows are dropped rather than blanked.
--
-- The four affected rows (all in the pre-existing test campaign) were deleted by id
-- out-of-band, as 0005 did for the stale output hints — an unpredicated bulk delete on a
-- live table isn't something a migration should normalise. Equivalent statement:
--   delete from plan_tools
--   where tool_id in (select id from tools where name in ('Analytics Tracker','Launch Scheduler'));
