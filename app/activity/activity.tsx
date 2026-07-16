import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { agentLabel, type AgentRun } from "@/lib/types";

/** p50 is the honest summary for latency; a mean gets dragged around by one slow web search. */
function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

function seconds(ms: number | null): string {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function when(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function Activity({
  runs,
  campaignName,
}: {
  runs: AgentRun[];
  campaignName: Record<string, string>;
}) {
  const finished = runs.filter((r) => r.status !== "running");
  const ok = finished.filter((r) => r.status === "ok");
  const failures = runs.filter((r) => r.status === "failed");

  const allDurations = ok
    .map((r) => r.duration_ms)
    .filter((d): d is number => d != null)
    .sort((a, b) => a - b);

  const successRate = finished.length === 0 ? null : Math.round((ok.length / finished.length) * 100);

  const byAgent = new Map<string, AgentRun[]>();
  for (const r of runs) byAgent.set(r.agent, [...(byAgent.get(r.agent) ?? []), r]);
  const agents = [...byAgent.entries()]
    .map(([agent, rs]) => {
      const done = rs.filter((r) => r.status !== "running");
      const good = done.filter((r) => r.status === "ok");
      const ds = good
        .map((r) => r.duration_ms)
        .filter((d): d is number => d != null)
        .sort((a, b) => a - b);
      return {
        agent,
        runs: rs.length,
        failed: done.length - good.length,
        rate: done.length === 0 ? null : Math.round((good.length / done.length) * 100),
        p50: percentile(ds, 50),
        p95: percentile(ds, 95),
      };
    })
    .sort((a, b) => b.runs - a.runs);

  const stats = [
    { k: "Agent runs", v: String(runs.length), d: runs.length >= 200 ? "most recent 200" : "all time" },
    {
      k: "Succeeded",
      v: successRate == null ? "—" : `${successRate}%`,
      d: `${failures.length} failed`,
    },
    { k: "Median run", v: seconds(percentile(allDurations, 50)), d: `95th: ${seconds(percentile(allDurations, 95))}` },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold">Activity</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Every AI run GrowthOS has made on your behalf — what it did, how long it took, and what
          failed. For how your campaigns are actually performing, use the UTM links from Analytics
          Tracker in your own analytics tool; GrowthOS can&apos;t see your traffic.
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="glass rounded-2xl border p-10 text-center">
          <h2 className="font-heading text-lg font-semibold">No AI runs yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a campaign, or press Run on a todo that has a tool assigned.
          </p>
          <div className="mt-6">
            <Link href="/" className={buttonVariants()}>
              Go to campaigns
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.k} className="glass rounded-2xl border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.k}
                </p>
                <p className="mt-1 font-heading text-3xl font-bold tabular-nums">{s.v}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>

          <section className="glass mb-6 overflow-hidden rounded-2xl border">
            <h2 className="border-b px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              By agent
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Agent</th>
                    <th className="px-4 py-2 text-right font-medium">Runs</th>
                    <th className="px-4 py-2 text-right font-medium">Succeeded</th>
                    <th className="px-4 py-2 text-right font-medium">Median</th>
                    <th className="px-4 py-2 text-right font-medium">95th</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.agent} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">{agentLabel(a.agent)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{a.runs}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {a.rate == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={a.failed > 0 ? "text-destructive" : ""}>{a.rate}%</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {seconds(a.p50)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {seconds(a.p95)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass overflow-hidden rounded-2xl border">
            <h2 className="border-b px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent failures
            </h2>
            {failures.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing has failed.
              </p>
            ) : (
              <ul className="divide-y">
                {failures.slice(0, 20).map((f) => (
                  <li key={f.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{agentLabel(f.agent)}</span>
                      {campaignName[f.campaign_id] && (
                        <Link
                          href={`/campaigns/${f.campaign_id}`}
                          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                        >
                          {campaignName[f.campaign_id]}
                        </Link>
                      )}
                      <Badge className="border-transparent bg-destructive/10 text-destructive">
                        failed
                      </Badge>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {seconds(f.duration_ms)} · {when(f.started_at)}
                      </span>
                    </div>
                    {f.error && (
                      <p className="mt-1 font-mono text-xs break-words text-muted-foreground">
                        {f.error}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
