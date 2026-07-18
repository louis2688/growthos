-- Which model produced each agent run, so the Activity page can price it correctly once the
-- agents no longer all run on one model (Haiku for the search agents, Cloudflare Workers AI
-- for the rest, Opus historically).
--
-- Nullable with no default: every existing row predates the model split and ran on Opus, so
-- pricing treats a null model as Opus. New rows record the real model string.
alter table agent_runs add column model text;
