"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startCampaign } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WizardStepper } from "@/components/wizard-stepper";

export type IntakeValues = { name: string; description: string; rawGoal: string };

export default function IntakeForm({
  initial,
  sourceName,
  recent,
}: {
  initial?: IntakeValues | null;
  sourceName?: string | null;
  recent?: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(startCampaign, null);
  // A failed submit's own values always win over the seed — the user may have edited
  // every field before the error, and reverting to the seed would eat those edits.
  const value = (k: keyof IntakeValues) => state?.values[k] ?? initial?.[k] ?? "";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All campaigns
        </Link>
      </div>
      <WizardStepper current={1} />
      <Card className="glass rounded-2xl shadow-lg shadow-primary/5">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">New campaign</CardTitle>
          <CardDescription>
            {sourceName ? (
              <>
                Started from <span className="font-medium text-foreground">{sourceName}</span> —
                everything below is editable, and the AI re-researches channels fresh for the new
                goal.
              </>
            ) : (
              "Tell the AI your goal. It analyzes it, researches channels, and you pick which to pursue."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sourceName && (recent?.length ?? 0) > 0 && (
            <div className="mb-5 rounded-xl border border-dashed p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Or start from a past campaign
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recent!.map((c) => (
                  <Link key={c.id} href={`/new?from=${c.id}`}>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer transition-colors hover:bg-primary/15"
                    >
                      {c.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={value("name")}
                placeholder="FocusFlow"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">What does it do? *</Label>
              <Textarea
                id="description"
                name="description"
                required
                defaultValue={value("description")}
                placeholder="A Pomodoro timer app with AI-planned deep work sessions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rawGoal">Goal *</Label>
              <Input
                id="rawGoal"
                name="rawGoal"
                required
                defaultValue={value("rawGoal")}
                placeholder="Get my AI budgeting app to 100 users in 30 days"
              />
              <p className="text-xs text-muted-foreground">
                The AI derives your audience and KPIs from this — you review them next.
              </p>
            </div>

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Analyzing your goal… ~30 seconds" : "Analyze my goal"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
