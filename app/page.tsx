import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import type { Campaign, Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await createClient();
  const [{ data: campaigns }, { data: todos }, { data: channels }] = await Promise.all([
    db.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
    db.from("todos").select("campaign_id, status, priority, due_date"),
    db.from("channels").select("campaign_id, name"),
  ]);

  const progress = new Map<string, { done: number; total: number }>();
  for (const t of todos ?? []) {
    const p = progress.get(t.campaign_id) ?? { done: 0, total: 0 };
    p.total += 1;
    if (t.status === "done") p.done += 1;
    progress.set(t.campaign_id, p);
  }
  const channelsByCampaign = new Map<string, string[]>();
  for (const c of (channels ?? []) as Pick<Channel, "campaign_id" | "name">[]) {
    channelsByCampaign.set(c.campaign_id, [...(channelsByCampaign.get(c.campaign_id) ?? []), c.name]);
  }

  const allTodos = todos ?? [];
  const doneCount = allTodos.filter((t) => t.status === "done").length;
  const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = allTodos.filter(
    (t) => t.status !== "done" && t.due_date && t.due_date >= today && t.due_date <= in7,
  );
  const dueSoonHigh = dueSoon.filter((t) => t.priority === "high").length;

  const stats = [
    { k: "Active campaigns", v: (campaigns ?? []).length, d: `across ${(channels ?? []).length} channels` },
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

      {(campaigns ?? []).length === 0 ? (
        <div className="glass rounded-2xl border p-10 text-center">
          <h2 className="text-lg font-semibold">No campaigns yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe your product and goal — the AI plans your growth.
          </p>
          <div className="mt-6">
            <Link href="/new" className={buttonVariants()}>
              Generate my first campaign
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(campaigns as Campaign[]).map((c) => {
            const p = progress.get(c.id) ?? { done: 0, total: 0 };
            const pct = p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
            return (
              <Link key={c.id} href={`/campaigns/${c.id}`}>
                <div className="glass h-full rounded-2xl border p-5 shadow-sm transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10">
                  <h3 className="font-heading text-base font-semibold">{c.title}</h3>
                  <p className="mt-0.5 mb-4 text-sm text-muted-foreground">{c.goal}</p>
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
    </main>
  );
}
