"use client";

import Link from "next/link";
import { useActionState } from "react";
import { findChannels } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const confidenceTone: Record<string, string> = {
  high: "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "border-transparent bg-muted text-muted-foreground",
};

export default function FinderForm() {
  const [state, formAction, pending] = useActionState(findChannels, null);

  return (
    <div className="space-y-6">
      <form action={formAction} className="glass space-y-4 rounded-2xl border p-5">
        <div className="space-y-2">
          <Label htmlFor="name">Product name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={state?.values.name ?? ""}
            placeholder="PitchPolish"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">What does it do?</Label>
          <Textarea
            id="description"
            name="description"
            required
            maxLength={600}
            defaultValue={state?.values.description ?? ""}
            placeholder="An AI tool that rewrites cold sales emails for founders"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audience">
            Who&apos;s it for? <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="audience"
            name="audience"
            maxLength={300}
            defaultValue={state?.values.audience ?? ""}
            placeholder="Early-stage B2B founders who send cold outreach"
          />
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Searching live communities… ~30–60s" : "Find my communities"}
        </Button>
      </form>

      {state?.channels && state.channels.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            {state.channels.length} places your audience is active
          </h2>
          <ul className="space-y-2.5">
            {state.channels.map((c, i) => (
              <li key={`${c.name}-${i}`} className="glass rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.platform} · {c.type}
                    </p>
                  </div>
                  <Badge className={confidenceTone[c.confidence] ?? confidenceTone.low}>
                    {c.confidence}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{c.reason}</p>
              </li>
            ))}
          </ul>

          <div className="glass rounded-2xl border border-dashed p-5 text-center">
            <p className="text-sm font-medium">
              Want the full playbook — prioritized todos, native copy, and tool picks?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              GrowthOS turns this into a campaign you can execute.
            </p>
            {/* prefetch={false}: /new is auth-gated, so prefetching it makes the proxy 307 the
                anonymous visitor's prefetch to /login — which can yank the whole tab to the login
                page right as results render. Don't prefetch a route this visitor may not pass. */}
            <Link href="/new" prefetch={false} className={`${buttonVariants()} mt-3`}>
              Build a free campaign →
            </Link>
          </div>
        </div>
      )}

      {state?.channels && state.channels.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No clear communities came back — try a more specific description.
        </p>
      )}
    </div>
  );
}
