import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

// Public free tools call a paid, web-searching agent. These caps bound anonymous spend: one IP
// gets a few runs/day, and a global ceiling caps the day's total cost no matter how many IPs
// show up. The global cap deliberately trades availability for a bounded bill — the right call
// for a free tool. Tune as real usage appears. The per-IP pool is SHARED across all free tools
// (finder, homepage preview): one bucket, one honest message.
const PER_IP_DAILY = 5;
const GLOBAL_DAILY = 150;

export type RateVerdict = { ok: true } | { ok: false; scope: "ip" | "global" };

// Signed-in users get generous daily caps a real early-access user never notices, but which turn
// a scripted account from a blank check into a bounded one. "search" covers the two paid
// Anthropic web-search paths (channel research, launch timing) — the actual wallet risk, so it's
// tight. "agent" covers the Cloudflare-backed actions — $0 per call, but they drain the shared
// 10k-neuron daily allocation, so unbounded loops would take the product down for everyone.
// ponytail: flat daily caps; per-tier credits (#57) replace this when billing lands.
const USER_AGENT_DAILY = 100;
const USER_SEARCH_DAILY = 20;

// Password-reset requests send email — a public, side-effectful endpoint. The per-IP cap stops
// bombing one inbox; the global cap protects the project's shared transactional-email quota
// (Supabase custom SMTP defaults to 30/hour), so a reset flood can't starve signup confirmations.
const RESET_IP_DAILY = 5;
const RESET_GLOBAL_DAILY = 100;

/** Daily cap on password-reset emails. Returns true if the send may proceed. Throws on limiter
 * failure — the caller fails closed. */
export async function consumeResetQuota(): Promise<boolean> {
  const db = createServiceClient();
  const ip = await clientIp();
  const day = new Date().toISOString().slice(0, 10);

  const { data: ipCount, error: ipErr } = await db.rpc("bump_rate_limit", {
    p_bucket: `reset:${ip}`,
    p_day: day,
  });
  if (ipErr) throw ipErr;
  if ((ipCount ?? 0) > RESET_IP_DAILY) return false;

  const { data: gCount, error: gErr } = await db.rpc("bump_rate_limit", {
    p_bucket: "GLOBAL-RESET",
    p_day: day,
  });
  if (gErr) throw gErr;
  return (gCount ?? 0) <= RESET_GLOBAL_DAILY;
}

/** Per-user daily cap. Returns true if the action may proceed. Throws on limiter failure —
 * callers fail closed. Charge-on-attempt BY DESIGN: the unit is consumed before the agent runs,
 * and a failed run is not refunded — paid search calls can bill partially even when they error,
 * so refunding would let a flaky upstream turn into unmetered spend. The user-facing quota copy
 * says failed runs count. */
export async function consumeUserQuota(userId: string, kind: "agent" | "search"): Promise<boolean> {
  const db = createServiceClient();
  const day = new Date().toISOString().slice(0, 10);
  const bucket = kind === "search" ? `user-search:${userId}` : `user:${userId}`;
  const cap = kind === "search" ? USER_SEARCH_DAILY : USER_AGENT_DAILY;
  const { data, error } = await db.rpc("bump_rate_limit", { p_bucket: bucket, p_day: day });
  if (error) throw error;
  return (data ?? 0) <= cap;
}

/**
 * The caller's IP for rate-limit keying. x-real-ip is set by Vercel from the connection and
 * can't be forged by the client. x-forwarded-for's LEFTMOST hop, by contrast, IS client-supplied
 * on Vercel (the platform appends the real IP on the right) — keying on split(",")[0] would let
 * one scripted host mint a fresh 5/day bucket per forged header and drain the whole global
 * budget. So: x-real-ip first, rightmost XFF hop as the fallback.
 */
async function clientIp(): Promise<string> {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = (h.get("x-forwarded-for") ?? "").split(",");
  return hops[hops.length - 1]!.trim() || "unknown";
}

/**
 * Durable, atomic daily rate limit backed by tool_rate_limit. Derives the IP itself (see
 * clientIp) so no caller can key the bucket on a spoofable value. Checks the per-IP bucket FIRST
 * so one abuser can only ever add a handful of counts to the global bucket before being cut off —
 * they can't run the global ceiling to zero and lock everyone else out. Uses the service-role
 * client because callers are anonymous (no session; RLS would block the write).
 */
export async function consumeSearchQuota(): Promise<RateVerdict> {
  const db = createServiceClient();
  const ip = await clientIp();
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
