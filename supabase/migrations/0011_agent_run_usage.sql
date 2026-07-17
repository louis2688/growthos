-- Token usage per agent run, so spend is visible instead of inferred.
--
-- Nullable with NO default: rows written before this migration have genuinely unknown usage,
-- and a default of 0 would assert those runs were free. Null means "not measured"; the UI
-- must exclude them from totals rather than silently count them as zero.
--
-- Counts, not dollars: pricing is applied at read time (lib/pricing.ts). Storing a cost
-- would freeze the rate of the day into the row.
alter table agent_runs
  add column input_tokens integer,
  add column output_tokens integer,
  -- Billed per request and priced separately from tokens, so it is counted, never folded
  -- into the cost estimate at a guessed rate. Only channel_research uses web search.
  add column web_search_requests integer;
