import { createClient } from "@/lib/supabase/server";
import type { Tool } from "@/lib/types";
import Catalog from "./catalog";

export const dynamic = "force-dynamic";

export default async function ToolboxPage() {
  const db = await createClient();
  const { data: tools } = await db.from("tools").select("*").order("name");
  return <Catalog tools={(tools ?? []) as Tool[]} />;
}
