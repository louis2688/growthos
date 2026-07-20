import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin";
import { MONTHLY_ALLOWANCE } from "@/lib/credits";
import { estimateCostUsd, formatUsd } from "@/lib/pricing";
import { AreaChart, CHART_COLORS, Donut, GoalBar, Sparkline } from "./charts";

export const dynamic = "force-dynamic";

const DAYS = 30;

/** Buckets ISO timestamps into counts per day for the last DAYS days, oldest first. */
function dailyCounts(timestamps: (string | null | undefined)[]): number[] {
  const counts = new Array(DAYS).fill(0);
  const today = Math.floor(Date.now() / 86_400_000);
  for (const ts of timestamps) {
    if (!ts) continue;
    const day = Math.floor(new Date(ts).getTime() / 86_400_000);
    const idx = DAYS - 1 - (today - day);
    if (idx >= 0 && idx < DAYS) counts[idx] += 1;
  }
  return counts;
}

/**
 * Founder-only ops view: signups, activation, AI usage and cost across ALL users — data no
 * RLS-scoped page can show. Every number is computed from real rows; nothing here is a
 * placeholder. Authorization is the isAdmin email check; everyone else is redirected as if
 * the page didn't exist. Grows into the billing ops dashboard with #56.
 */
export default async function AdminPage() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  if (!isAdmin(data.user.email)) redirect("/");

  const service = createServiceClient();
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const month = new Date().toISOString().slice(0, 7);

  // listUsers pages at 1000 — far beyond early access; revisit with real scale.
  // throwOnError on every read: a failed query must surface as an error page, not render as
  // "0 users / no runs" that a founder might believe (same posture as the Activity page).
  const [{ data: userList, error: usersErr }, { data: campaignRows }, { data: runs }, { data: credits }] =
    await Promise.all([
      service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      service.from("campaigns").select("user_id, created_at").throwOnError(),
      service
        .from("agent_runs")
        .select("agent, status, started_at, duration_ms, input_tokens, output_tokens, model")
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .throwOnError(),
      service.from("credit_usage").select("spent").eq("month", month).throwOnError(),
    ]);
  if (usersErr) throw new Error(`listUsers failed: ${usersErr.message}`);

  const users = userList?.users ?? [];
  const campaigns = campaignRows ?? [];
  const allRuns = runs ?? [];
  const owners = new Set(campaigns.map((c) => c.user_id as string));
  const campaignsPerUser = new Map<string, number>();
  for (const c of campaigns) {
    const id = c.user_id as string;
    campaignsPerUser.set(id, (campaignsPerUser.get(id) ?? 0) + 1);
  }

  // Cost this month from real token counts at each run's own model rate — the same math as
  // the Activity page, so the two surfaces can never disagree.
  const monthStart = `${month}-01`;
  const monthCost = allRuns
    .filter((r) => r.started_at >= monthStart && r.input_tokens != null)
    .reduce((s, r) => s + estimateCostUsd(r.input_tokens ?? 0, r.output_tokens ?? 0, r.model), 0);

  const signupsDaily = dailyCounts(users.map((u) => u.created_at));
  const campaignsDaily = dailyCounts(campaigns.map((c) => c.created_at as string));
  const runsDaily = dailyCounts(allRuns.map((r) => r.started_at));

  const cards = [
    { label: "Users", value: String(users.length), spark: signupsDaily, delta: `+${users.filter((u) => u.created_at >= weekAgo).length} this week` },
    { label: "Campaigns", value: String(campaigns.length), spark: campaignsDaily, delta: `${owners.size} activated users` },
    { label: `Agent runs (${DAYS}d)`, value: String(allRuns.length), spark: runsDaily, delta: `${allRuns.filter((r) => r.status === "failed").length} failed` },
    { label: "Est. AI cost this month", value: formatUsd(monthCost), spark: runsDaily, delta: `${(credits ?? []).reduce((s, r) => s + r.spent, 0)} credits spent` },
  ];

  const byAgent = new Map<string, number>();
  for (const r of allRuns) byAgent.set(r.agent, (byAgent.get(r.agent) ?? 0) + 1);
  const donutSlices = [...byAgent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value], i) => ({ label: label.replace(/_/g, " "), value, color: CHART_COLORS[i] }));
  const otherCount = allRuns.length - donutSlices.reduce((s, x) => s + x.value, 0);
  if (otherCount > 0) donutSlices.push({ label: "other", value: otherCount, color: CHART_COLORS[5] });

  // Sparse day labels: first, every 7th, last.
  const dayLabels = Array.from({ length: DAYS }, (_, i) => {
    if (i !== 0 && i !== DAYS - 1 && i % 7 !== 0) return "";
    const d = new Date(Date.now() - (DAYS - 1 - i) * 86_400_000);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const recent = [...users].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 15);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-heading text-2xl font-medium">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Founders only · every number is live from the database · credit allowance{" "}
        {MONTHLY_ALLOWANCE}/month during early access
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border p-4">
            <p className="text-[12px] text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-medium">{c.value}</p>
            <p className="text-[12px] text-muted-foreground">{c.delta}</p>
            <div className="mt-2 text-primary">
              <Sparkline points={c.spark} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border p-4">
          <h2 className="text-[13px] font-medium">Daily activity — last {DAYS} days</h2>
          <div className="mt-3">
            <AreaChart
              labels={dayLabels}
              series={[
                { name: "Agent runs", color: CHART_COLORS[0], points: runsDaily },
                { name: "Signups", color: CHART_COLORS[2], points: signupsDaily },
              ]}
            />
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <h2 className="text-[13px] font-medium">What the AI is doing ({DAYS}d)</h2>
            <div className="mt-3">
              {donutSlices.length > 0 ? (
                <Donut slices={donutSlices} />
              ) : (
                <p className="text-sm text-muted-foreground">No runs yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="text-[13px] font-medium">Early-bird goals</h2>
            <div className="mt-3 space-y-4">
              <GoalBar label="Users onboarded" value={users.length} target={20} />
              <GoalBar label="Activated (≥1 campaign)" value={owners.size} target={10} />
            </div>
          </section>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent agent runs
        </h2>
        <div className="mt-2 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[12px] text-muted-foreground">
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Duration</th>
                <th className="px-4 py-2 font-medium">Est. cost</th>
                <th className="px-4 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {allRuns.slice(0, 10).map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2">{r.agent.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2">
                    <span className={r.status === "failed" ? "text-destructive" : r.status === "ok" ? "text-primary" : "text-muted-foreground"}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}</td>
                  <td className="px-4 py-2">
                    {r.input_tokens != null
                      ? formatUsd(estimateCostUsd(r.input_tokens, r.output_tokens ?? 0, r.model))
                      : "—"}
                  </td>
                  <td className="px-4 py-2">{r.started_at.slice(5, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent signups
        </h2>
        <div className="mt-2 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[12px] text-muted-foreground">
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium">Last seen</th>
                <th className="px-4 py-2 font-medium">Campaigns</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{(u.user_metadata?.full_name as string) ?? "—"}</td>
                  <td className="px-4 py-2">{u.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-2">{u.last_sign_in_at?.slice(0, 10) ?? "never"}</td>
                  <td className="px-4 py-2">{campaignsPerUser.get(u.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
