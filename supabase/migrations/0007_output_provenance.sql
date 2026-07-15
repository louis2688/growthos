-- todos.output had no provenance: reassigning a todo's tool left the old artifact in
-- place, and the UI captioned it with the NEW tool's name — the panel claimed a draft
-- came from a tool that never wrote it. Record which tool actually produced it.
alter table todos add column output_tool_id uuid references tools(id) on delete set null;

-- Existing artifacts were all produced by the tool currently assigned (the only way to
-- write output until now was running that tool), so backfill from tool_id.
update todos set output_tool_id = tool_id where output is not null;
