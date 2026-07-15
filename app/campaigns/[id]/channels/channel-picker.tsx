"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { generatePlans } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Campaign, Channel, Confidence, Goal } from "@/lib/types";

const confidencePill: Record<Confidence, string> = {
  high: "border-transparent bg-emerald-600/10 text-emerald-600 dark:text-emerald-400",
  medium: "border-transparent bg-primary/10 text-primary",
  low: "border-transparent bg-muted-foreground/15 text-muted-foreground",
};

export default function ChannelPicker({
  campaign,
  goal,
  channels,
}: {
  campaign: Campaign;
  goal: Goal;
  channels: Channel[];
}) {
  const [state, formAction, pending] = useActionState(generatePlans, null);
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(channels.filter((c) => c.selected).map((c) => c.id)),
  );

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All campaigns
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{campaign.name} — pick your channels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step 3 of 3 — the AI researched where &ldquo;{goal.audience}&rdquo; can be reached.
          Select 2–6 to pursue; each gets its own plan and todos.
        </p>
      </div>

      <form action={formAction}>
        <input type="hidden" name="campaignId" value={campaign.id} />
        {[...picked].map((id) => (
          <input key={id} type="hidden" name="channelIds" value={id} />
        ))}

        <div className="space-y-3">
          {channels.map((c) => {
            const on = picked.has(c.id);
            return (
              <label
                key={c.id}
                className={`glass flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  on ? "border-primary shadow-sm shadow-primary/10" : "hover:border-primary/40"
                }`}
              >
                <Checkbox
                  className="mt-1"
                  checked={on}
                  onCheckedChange={() => toggle(c.id)}
                  aria-label={`Select ${c.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading font-semibold">{c.name}</span>
                    <Badge variant="outline">{c.platform}</Badge>
                    <Badge variant="secondary">{c.type}</Badge>
                    <Badge className={confidencePill[c.confidence]}>{c.confidence}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{c.reason}</p>
                </div>
              </label>
            );
          })}
        </div>

        {state?.error && <p className="mt-4 text-sm text-destructive">{state.error}</p>}

        <div className="mt-6 flex items-center gap-4">
          <Button type="submit" disabled={pending || picked.size < 2 || picked.size > 6}>
            {pending
              ? "Building plans and todos… 1–3 minutes"
              : `Generate campaign (${picked.size} selected)`}
          </Button>
          {!pending && (picked.size < 2 || picked.size > 6) && (
            <span className="text-sm text-muted-foreground">Select 2–6 channels.</span>
          )}
        </div>
      </form>
    </main>
  );
}
