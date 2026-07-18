import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient, currentUser } from "@/lib/supabase/server";
import { stepPath } from "@/lib/wizard";
import { wizardStep, type Campaign, type Channel, type Goal } from "@/lib/types";
import { ArchivedCampaigns } from "./archived-campaigns";
import Landing from "@/components/landing";

export const dynamic = "force-dynamic";

const stepLabel = {
  analysis: "Resume — review goal",
  channels: "Resume — pick channels",
  review: "Resume — review plans",
  dashboard: "Open",
} as const;

export default async function Home() {
  // Logged-out visitors get the public marketing landing; the proxy exempts "/" so they reach it
  // instead of being bounced to /login. Signed-in users fall through to their campaigns dashboard.
  if (!(await currentUser())) return <Landing />;

  const db = await createClient();
  // throwOnError: a failed read must surface an error page, not an empty result that
  // renders "No campaigns yet" to someone who has ten.
  const [{ data: campaigns }, { data: goals }, { data: todos }, { data: channels }] =
    await Promise.all([
      db
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .throwOnError(),
      db
        .from("goals")
        .select("campaign_id, objective, target_value, target_metric, timeframe")
        .throwOnError(),
      db.from("todos").select("campaign_id, status, priority, due_date").throwOnError(),
      db.from("channels").select("campaign_id, name").eq("selected", true).throwOnError(),
    ]);

  const everything = (campaigns ?? []) as Campaign[];
  const archived = everything.filter((c) => c.status === "archived");
  // Archived campaigns are fetched (so they can be restored) but excluded from the list and
  // from every stat — archived work must not inflate "Todos done" / "across N channels".
  const all = everything.filter((c) => c.status !== "archived");
  const visibleIds = new Set(all.map((c) => c.id));

  const goalByCampaign = new Map(
    ((goals ?? []) as Pick<
      Goal,
      "campaign_id" | "objective" | "target_value" | "target_metric" | "timeframe"
    >[]).map((g) => [g.campaign_id, g]),
  );
  const allTodos = (todos ?? []).filter((t) => visibleIds.has(t.campaign_id));
  const visibleChannels = ((channels ?? []) as Pick<Channel, "campaign_id" | "name">[]).filter((c) =>
    visibleIds.has(c.campaign_id),
  );

  const progress = new Map<string, { done: number; total: number }>();
  for (const t of allTodos) {
    const p = progress.get(t.campaign_id) ?? { done: 0, total: 0 };
    p.total += 1;
    if (t.status === "done") p.done += 1;
    progress.set(t.campaign_id, p);
  }
  const channelsByCampaign = new Map<string, string[]>();
  for (const c of visibleChannels) {
    channelsByCampaign.set(c.campaign_id, [...(channelsByCampaign.get(c.campaign_id) ?? []), c.name]);
  }

  const active = all.filter((c) => c.status === "active");
  const inProgress = all.filter((c) => c.status !== "active");

  const doneCount = allTodos.filter((t) => t.status === "done").length;
  const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = allTodos.filter(
    (t) => t.status !== "done" && t.due_date && t.due_date >= today && t.due_date <= in7,
  );
  const dueSoonHigh = dueSoon.filter((t) => t.priority === "high").length;

  const stats = [
    { k: "Active campaigns", v: active.length, d: `across ${visibleChannels.length} channels` },
    { k: "Todos done", v: doneCount, d: `of ${allTodos.length} total` },
    { k: "Due in next 7 days", v: dueSoon.length, d: `${dueSoonHigh} high priority` },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link href="/new" className={buttonVariants()}>
          New Campaign
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.k} className="glass rounded-2xl border p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.k}</p>
            <p className="mt-1 font-heading text-3xl font-bold tabular-nums">{s.v}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>

      {inProgress.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Unfinished setup
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {inProgress.map((c) => {
              const step = wizardStep(c.status);
              return (
                <Link key={c.id} href={stepPath(c.id, step)}>
                  <div className="glass h-full rounded-2xl border border-dashed p-4 transition-all hover:border-primary">
                    <h3 className="font-heading text-base font-semibold">{c.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{c.description}</p>
                    <Badge className="mt-3 border-transparent bg-primary/10 text-primary">
                      {stepLabel[step]}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {all.length === 0 ? (
        <div className="glass rounded-2xl border p-10 text-center">
          <h2 className="text-lg font-semibold">No campaigns yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe your product and goal — the AI plans your growth.
          </p>
          <div className="mt-6">
            <Link href="/new" className={buttonVariants()}>
              Start my first campaign
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((c) => {
            const g = goalByCampaign.get(c.id);
            const goalLine = g
              ? [
                  g.objective,
                  g.target_value && g.target_metric ? `${g.target_value} ${g.target_metric}` : "",
                  g.timeframe ? `in ${g.timeframe}` : "",
                ]
                  .filter(Boolean)
                  .join(" — ")
              : c.description;
            const p = progress.get(c.id) ?? { done: 0, total: 0 };
            const pct = p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
            return (
              <Link key={c.id} href={`/campaigns/${c.id}`}>
                <div className="glass h-full rounded-2xl border p-5 shadow-sm transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10">
                  <h3 className="font-heading text-base font-semibold">{c.name}</h3>
                  <p className="mt-0.5 mb-4 text-sm text-muted-foreground">{goalLine}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-primary to-brand-pink"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                    {p.done}/{p.total} done · {pct}%
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(channelsByCampaign.get(c.id) ?? []).map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ArchivedCampaigns campaigns={archived} />
    </main>
  );
}
