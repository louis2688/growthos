"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createCampaign } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function IntakeForm() {
  const [state, formAction, pending] = useActionState(createCampaign, null);

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
            Tell the AI about your product and goal — it will build the campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Product name *</Label>
              <Input
                id="productName"
                name="productName"
                required
                defaultValue={state?.values.productName ?? ""}
                placeholder="FocusFlow"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productDescription">What does it do? *</Label>
              <Textarea
                id="productDescription"
                name="productDescription"
                required
                defaultValue={state?.values.productDescription ?? ""}
                placeholder="A Pomodoro timer app with AI-planned deep work sessions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Target audience *</Label>
              <Input
                id="audience"
                name="audience"
                required
                defaultValue={state?.values.audience ?? ""}
                placeholder="Freelance developers and designers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Goal (include a timeframe) *</Label>
              <Input
                id="goal"
                name="goal"
                required
                defaultValue={state?.values.goal ?? ""}
                placeholder="10,000 users in 90 days"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (optional)</Label>
              <Input
                id="budget"
                name="budget"
                defaultValue={state?.values.budget ?? ""}
                placeholder="$500/month"
              />
            </div>

            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Generating your campaign… this takes a minute or two" : "Generate my campaign"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
