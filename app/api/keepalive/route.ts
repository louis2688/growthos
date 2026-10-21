import { createClient } from "@supabase/supabase-js";

// Hit daily by the Vercel cron in vercel.json. Supabase's free tier pauses a project after 7 days
// without DB activity, which took the whole app down twice. One anon query (RLS returns nothing)
// counts as activity. No session cookies, so it never triggers a token refresh.
// ponytail: delete this + the cron once the project is on a paid Supabase plan.
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase.from("campaigns").select("id", { head: true }).limit(1);
  return Response.json({ ok: !error, error: error?.message }, { status: error ? 503 : 200 });
}
