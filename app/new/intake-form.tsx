"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startCampaign } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function IntakeForm() {
  const [state, formAction, pending] = useActionState(startCampaign, null);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All campaigns
        </Link>
      </div>
      <Card className="glass rounded-2xl shadow-lg shadow-primary/5">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">New campaign</CardTitle>
          <CardDescription>
            Step 1 of 3 — tell the AI your goal. It analyzes it, researches channels, and you
            pick which to pursue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={state?.values.name ?? ""}
                placeholder="FocusFlow"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">What does it do? *</Label>
              <Textarea
                id="description"
                name="description"
                required
                defaultValue={state?.values.description ?? ""}
                placeholder="A Pomodoro timer app with AI-planned deep work sessions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rawGoal">Goal *</Label>
              <Input
                id="rawGoal"
                name="rawGoal"
                required
                defaultValue={state?.values.rawGoal ?? ""}
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
