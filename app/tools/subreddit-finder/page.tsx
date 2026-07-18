import type { Metadata } from "next";
import FinderForm from "./finder-form";

export const metadata: Metadata = {
  title: "Free Subreddit & Community Finder — GrowthOS",
  description:
    "Describe your product and get the specific subreddits, communities, and directories where your audience is active right now — found by live web search, not a stale list.",
};

// Public marketing tool: allow-listed in lib/supabase/proxy.ts so it renders without login.
export default function SubredditFinderPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Free tool · no signup
        </p>
        <h1 className="mt-2 text-balance font-heading text-3xl font-bold">
          Find the communities your audience is actually in
        </h1>
        <p className="mx-auto mt-3 max-w-prose text-sm text-muted-foreground">
          Describe your product. GrowthOS runs a live web search to surface the specific
          subreddits, communities, and directories where those people are active right now — not a
          stale, generic list. Then you go post where it counts.
        </p>
      </div>

      <FinderForm />

      <p className="mx-auto mt-8 max-w-prose text-center text-xs text-muted-foreground">
        Results come from live search and the model&apos;s read of it — verify a community is a fit
        and read its rules before posting. GrowthOS never posts for you.
      </p>
    </main>
  );
}
