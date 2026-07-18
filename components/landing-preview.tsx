"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { previewCampaign } from "@/app/preview-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const confidenceTone: Record<string, string> = {
  high: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
};

/**
 * Staged pending copy. One server action runs analysis (~10-30s, Cloudflare) then live channel
 * search (~1 min, Haiku + web search); the timer approximates which phase is running so the wait
 * reads as progress, not a hang. Purely cosmetic — the real sequencing happens server-side.
 */
function PendingLabel() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span>
      {elapsed < 25
        ? "Analyzing your goal… ~30s"
        : "Searching live communities… up to a minute more"}
    </span>
  );
}

export default function LandingPreview() {
  const [state, formAction, pending] = useActionState(previewCampaign, null);

  const kpiPills = state?.analysis
    ? [
        state.analysis.target_value && state.analysis.target_metric
          ? `${state.analysis.target_value} ${state.analysis.target_metric}`
          : "",
        state.analysis.timeframe ? `in ${state.analysis.timeframe}` : "",
      ].filter(Boolean)
    : [];

  return (
    <div className="glass rounded-2xl border p-5 shadow-xl shadow-primary/10">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Try it now — free, no signup
      </p>
      {/* The form stays mounted below results so a visitor can fix a typo or try another
          product without hunting for a page reload — same pattern as the Subreddit Finder. */}
      <form action={formAction} className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="pv-name">Product name</Label>
          <Input
            id="pv-name"
            name="name"
            required
            maxLength={80}
            defaultValue={state?.values.name ?? ""}
            placeholder="FocusFlow"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pv-description">What does it do?</Label>
          <Textarea
            id="pv-description"
            name="description"
            required
            maxLength={600}
            rows={2}
            defaultValue={state?.values.description ?? ""}
            placeholder="A Pomodoro timer app with AI-planned deep work sessions"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pv-goal">Your goal</Label>
          <Input
            id="pv-goal"
            name="rawGoal"
            required
            maxLength={200}
            defaultValue={state?.values.rawGoal ?? ""}
            placeholder="Get 500 signups in 60 days"
          />
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <PendingLabel /> : state?.analysis ? "Run another preview" : "Preview my campaign — free"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Runs the real AI, including live web search. Nothing is saved until you sign up.
        </p>
      </form>

      {/* Persistent live region: it exists before results do, so screen readers announce the
          content when the ~90s action finally resolves instead of saying nothing. */}
      <div role="status" aria-live="polite">
        <p className="sr-only">{pending ? "Generating your preview…" : state?.analysis ? "Preview ready." : ""}</p>
        {state?.analysis && (
          <div className="mt-4 border-t pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Goal analysis
            </p>
            <p className="mt-1.5 text-sm font-medium">{state.analysis.objective}</p>
            <p className="mt-1 text-sm text-muted-foreground">Audience: {state.analysis.audience}</p>
            {kpiPills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {kpiPills.map((k) => (
                  <span key={k} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                    {k}
                  </span>
                ))}
              </div>
            )}
            {state.analysis.validation_note && (
              <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                {state.analysis.validation_note}
              </p>
            )}

            <div className="my-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <span className="h-px flex-1 bg-border" /> where your audience is
              <span className="h-px flex-1 bg-border" />
            </div>

            {state.channels ? (
              <ul className="space-y-2">
                {state.channels.slice(0, 5).map((c, i) => (
                  <li key={`${c.name}-${i}`} className="rounded-lg border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${confidenceTone[c.confidence] ?? confidenceTone.low}`}
                      >
                        {c.confidence}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.reason}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{state.channelsError}</p>
            )}

            <div className="mt-4 rounded-xl border border-dashed p-3.5 text-center">
              <p className="text-sm font-medium">Next: plans, prioritized todos, and ready-to-paste copy.</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This preview isn&apos;t saved — create a free account to build the full campaign.
              </p>
              <Link href="/login" className={`${buttonVariants({ size: "sm" })} mt-2.5`}>
                Sign up free <ArrowRight className="ml-1 size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
