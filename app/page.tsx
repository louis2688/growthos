import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = supabase();
  const [{ data: campaigns }, { data: todos }] = await Promise.all([
    db.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
    db.from("todos").select("campaign_id, status"),
  ]);

  const progress = new Map<string, { done: number; total: number }>();
  for (const t of todos ?? []) {
    const p = progress.get(t.campaign_id) ?? { done: 0, total: 0 };
    p.total += 1;
    if (t.status === "done") p.done += 1;
    progress.set(t.campaign_id, p);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">GrowthOS</h1>
        <Link href="/new" className={buttonVariants()}>
          New Campaign
        </Link>
      </div>

      {(campaigns ?? []).length === 0 ? (
        <p className="text-muted-foreground">
          No campaigns yet. Create one and let the AI plan your growth.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(campaigns as Campaign[]).map((c) => {
            const p = progress.get(c.id) ?? { done: 0, total: 0 };
            const pct = p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
            return (
              <Link key={c.id} href={`/campaigns/${c.id}`}>
                <Card className="h-full transition-colors hover:bg-accent/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <CardDescription>{c.goal}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">
                      {p.done}/{p.total} done · {pct}%
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
