import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin";
import { MONTHLY_ALLOWANCE } from "@/lib/credits";

export const dynamic = "force-dynamic";

/**
 * Founder-only ops view: signup count, activation, and AI usage across ALL users — data no
 * RLS-scoped page can show. Authorization is the isAdmin email check below; everyone else is
 * redirected as if the page didn't exist. Grows into the billing ops dashboard with #56.
 */
export default async function AdminPage() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  if (!isAdmin(data.user.email)) redirect("/");

  const service = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const month = new Date().toISOString().slice(0, 7);

  // listUsers pages at 1000 — far beyond early access; revisit with real scale.
  const [{ data: userList }, { data: campaignOwners }, runsTotal, runsWeek, { data: credits }] =
    await Promise.all([
      service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      service.from("campaigns").select("user_id"),
      service.from("agent_runs").select("id", { count: "exact", head: true }),
      service.from("agent_runs").select("id", { count: "exact", head: true }).gte("started_at", weekAgo),
      service.from("credit_usage").select("spent").eq("month", month),
    ]);

  const users = userList?.users ?? [];
  const owners = new Set((campaignOwners ?? []).map((c) => c.user_id as string));
  const campaignsPerUser = new Map<string, number>();
  for (const c of campaignOwners ?? []) {
    const id = c.user_id as string;
    campaignsPerUser.set(id, (campaignsPerUser.get(id) ?? 0) + 1);
  }

  const stats = [
    { label: "Users", value: users.length },
    {
      label: "New this week",
      value: users.filter((u) => u.created_at >= weekAgo).length,
    },
    { label: "Activated (≥1 campaign)", value: owners.size },
    { label: "Campaigns", value: campaignOwners?.length ?? 0 },
    { label: "Agent runs (7d)", value: `${runsWeek.count ?? 0} of ${runsTotal.count ?? 0}` },
    {
      label: "Credits spent this month",
      value: (credits ?? []).reduce((s, r) => s + r.spent, 0),
    },
  ];

  const recent = [...users]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 15);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="font-heading text-2xl font-medium">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Founders only. Every account, credit allowance {MONTHLY_ALLOWANCE}/month during early
        access.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border p-4">
            <p className="text-[12px] text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-medium">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
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
