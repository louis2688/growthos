"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmGoal } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WizardStepper } from "@/components/wizard-stepper";
import { CampaignDanger } from "@/components/campaign-danger";
import type { Campaign, Goal } from "@/lib/types";

export default function AnalysisForm({ campaign, goal }: { campaign: Campaign; goal: Goal }) {
  const [state, formAction, pending] = useActionState(confirmGoal, null);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All campaigns
        </Link>
      </div>
      <WizardStepper current={2} />
      <Card className="glass rounded-2xl shadow-lg shadow-primary/5">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">{campaign.name} — goal analysis</CardTitle>
          <CardDescription>
            The AI&apos;s read of your goal. Edit anything that&apos;s off, then it researches where
            to reach this audience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {goal.validation_note && (
            <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm">
              <p className="font-medium">Reality check</p>
              <p className="mt-0.5 text-muted-foreground">{goal.validation_note}</p>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="campaignId" value={campaign.id} />

            <div className="space-y-2">
              <Label htmlFor="objective">Objective *</Label>
              <Input id="objective" name="objective" required defaultValue={goal.objective} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="target_value">Target</Label>
                <Input id="target_value" name="target_value" defaultValue={goal.target_value} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_metric">Metric</Label>
                <Input id="target_metric" name="target_metric" defaultValue={goal.target_metric} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe</Label>
                <Input id="timeframe" name="timeframe" defaultValue={goal.timeframe} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Audience *</Label>
              <Input id="audience" name="audience" required defaultValue={goal.audience} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="success_definition">What success looks like</Label>
              <Textarea
                id="success_definition"
                name="success_definition"
                defaultValue={goal.success_definition}
              />
            </div>

            {goal.kpis.length > 0 && (
              <div className="space-y-2">
                <Label>Suggested KPIs</Label>
                <div className="flex flex-wrap gap-1.5">
                  {goal.kpis.map((k) => (
                    <Badge key={k} variant="secondary">
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Researching channels on the web… 1–2 minutes" : "Find my channels"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <CampaignDanger campaignId={campaign.id} campaignName={campaign.name} canArchive={false} />
    </main>
  );
}
