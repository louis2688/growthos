import { createClient } from "@/lib/supabase/server";
import type { Tool } from "@/lib/types";
import Catalog, { type ToolUsage } from "./catalog";

export const dynamic = "force-dynamic";

export default async function ToolboxPage() {
  const db = await createClient();
  // RLS scopes plan_tools/todos to the caller, so usage counts are this user's own.
  // throwOnError: a failed read must surface an error page, not an empty catalog that
  // reads as "no tools match" and invites the user to blame their search.
  const [{ data: tools }, { data: planTools }, { data: todos }] = await Promise.all([
    db.from("tools").select("*").order("name").throwOnError(),
    db.from("plan_tools").select("tool_id, plan_id").throwOnError(),
    db.from("todos").select("tool_id, campaign_id").throwOnError(),
  ]);

  const usage: Record<string, ToolUsage> = {};
  for (const t of (tools ?? []) as Tool[]) usage[t.id] = { plans: 0, todos: 0 };
  for (const pt of planTools ?? []) if (usage[pt.tool_id]) usage[pt.tool_id].plans += 1;
  for (const td of todos ?? []) if (td.tool_id && usage[td.tool_id]) usage[td.tool_id].todos += 1;

  return <Catalog tools={(tools ?? []) as Tool[]} usage={usage} />;
}
