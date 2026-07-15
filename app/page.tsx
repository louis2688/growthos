import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Campaign, Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5 font-heading text-xl font-bold">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-brand-pink text-white">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      </span>
      GrowthOS
    </span>
  );
}

export default async function Home() {
  const db = supabase();
  const [{ data: campaigns }, { data: todos }, { data: channels }] = await Promise.all([
    db.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
    db.from("todos").select("campaign_id, status"),
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="mb-10 flex items-center justify-between gap-4">
        <Wordmark />
        <Link href="/new" className={buttonVariants()}>
          New Campaign
        </Link>
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
