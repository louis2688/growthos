import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

// Public free tools call a paid, web-searching agent. These caps bound anonymous spend: one IP
// gets a few runs/day, and a global ceiling caps the day's total cost no matter how many IPs
// show up. The global cap deliberately trades availability for a bounded bill — the right call
// for a free tool. Tune as real usage appears.
const PER_IP_DAILY = 5;
const GLOBAL_DAILY = 150;

export type RateVerdict = { ok: true } | { ok: false; scope: "ip" | "global" };

/**
 * Durable, atomic daily rate limit backed by tool_rate_limit. Checks the per-IP bucket FIRST so
 * one abuser can only ever add a handful of counts to the global bucket before being cut off —
 * they can't run the global ceiling to zero and lock everyone else out. Uses the service-role
 * client because callers are anonymous (no session; RLS would block the write).
 */
export async function consumeSearchQuota(ip: string): Promise<RateVerdict> {
  const db = createServiceClient();
  const day = new Date().toISOString().slice(0, 10);

  const { data: ipCount, error: ipErr } = await db.rpc("bump_rate_limit", {
    p_bucket: `ip:${ip}`,
    p_day: day,
  });
  if (ipErr) throw ipErr;
  if ((ipCount ?? 0) > PER_IP_DAILY) return { ok: false, scope: "ip" };

  const { data: globalCount, error: gErr } = await db.rpc("bump_rate_limit", {
    p_bucket: "GLOBAL",
    p_day: day,
  });
  if (gErr) throw gErr;
  if ((globalCount ?? 0) > GLOBAL_DAILY) return { ok: false, scope: "global" };

  return { ok: true };
}
