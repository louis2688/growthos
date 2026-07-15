-- Phase 4: two more catalog tools become executable.
--
-- Both are `beta` in the catalog and stay that way — beta describes how proven the
-- tool is, not whether it runs. availability() keys off `handler`, so these light up
-- as ready-to-run while still reading beta on the card.
update tools set handler = 'seo_optimizer' where name = 'SEO Optimizer';
update tools set handler = 'email_digest' where name = 'Email Digest Composer';

-- Dave's toolbox.html copy for these two described capabilities narrower than what
-- the agents actually do, and the Toolbox is a promise to the user. Reworded to
-- match the implementations.
update tools
set description = 'Picks the search terms your audience actually types, then writes copy around them without flattening the channel''s voice.'
where name = 'SEO Optimizer';

update tools
set description = 'Turns the milestones you have actually completed in a campaign into a subscriber-ready email draft.'
where name = 'Email Digest Composer';
