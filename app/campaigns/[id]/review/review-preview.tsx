"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { backToChannels, confirmCampaign } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WizardStepper } from "@/components/wizard-stepper";
import { CampaignDanger } from "@/components/campaign-danger";
import type { Campaign, Channel, Goal, Plan, PlanTool, Priority, Todo, Tool } from "@/lib/types";

const priorityPill: Record<Priority, string> = {
  high: "border-transparent bg-destructive/10 text-destructive",
  medium: "border-transparent bg-primary/10 text-primary",
  low: "border-transparent bg-muted-foreground/15 text-muted-foreground",
};

export default function ReviewPreview({
  campaign,
  goal,
  channels,
  plans,
  todos,
  tools,
  planTools,
}: {
  campaign: Campaign;
  goal: Goal;
  channels: Channel[];
  plans: Plan[];
  todos: Todo[];
  tools: Tool[];
  planTools: PlanTool[];
}) {
  const [pending, start] = useTransition();
  const [backPending, startBack] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toolById = new Map(tools.map((t) => [t.id, t]));
  const channelById = new Map(channels.map((c) => [c.id, c]));

  const goalLine = [
    goal.target_value && goal.target_metric ? `${goal.target_value} ${goal.target_metric}` : "",
    goal.timeframe ? `in ${goal.timeframe}` : "",
  ]
    .filter(Boolean)
    .join(" ") || goal.objective;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All campaigns
        </Link>
      </div>
      <WizardStepper current={4} />

      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold">Review your campaign</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what the AI built. Nothing is live yet — go back to change channels, or
          generate to start executing.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="glass rounded-2xl border p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Campaign
          </p>
          <p className="mt-1 font-heading text-lg font-bold">{campaign.name}</p>
        </div>
        <div className="glass rounded-2xl border p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Goal
          </p>
          <p className="mt-1 font-heading text-lg font-bold">{goalLine}</p>
        </div>
      </div>

      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Plans to be created
      </p>

      <div className="space-y-4">
        {plans.map((plan) => {
          const planTodos = todos.filter((t) => t.plan_id === plan.id);
          const suggested = planTools.filter((pt) => pt.plan_id === plan.id);
          return (
            <section key={plan.id} className="glass overflow-hidden rounded-2xl border">
              <header className="flex flex-wrap items-center gap-2 border-b bg-card/60 px-4 py-3">
                <h2 className="font-heading font-semibold">{plan.title}</h2>
                <Badge variant="outline">{channelById.get(plan.channel_id)?.name}</Badge>
                <Badge className={priorityPill[plan.priority]}>{plan.priority}</Badge>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {planTodos.length} todos
                </span>
              </header>

              <ul className="divide-y">
                {planTodos.map((todo) => {
                  const tool = todo.tool_id ? toolById.get(todo.tool_id) : null;
                  return (
                    <li key={todo.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                      <span className="mt-1 size-3 flex-none rounded-sm border" />
                      <span className="flex-1">{todo.title}</span>
                      {tool && (
                        <Badge className="flex-none border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                          {tool.name}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>

              {suggested.length > 0 && (
                <div className="border-t bg-muted/30 px-4 py-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggested tools
                  </p>
                  <div className="space-y-1.5">
                    {suggested.map((pt) => (
                      <div key={pt.id} className="flex flex-wrap items-baseline gap-2 text-xs">
                        <Badge className="border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                          {toolById.get(pt.tool_id)?.name}
                        </Badge>
                        <span className="flex-1 text-muted-foreground">{pt.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={backPending || pending}
          onClick={() =>
            startBack(async () => {
              const result = await backToChannels(campaign.id);
              if (result?.error) setError(result.error);
            })
          }
        >
          {backPending ? "Going back…" : "← Back to channels"}
        </Button>
        <Button
          disabled={pending || backPending}
          onClick={() =>
            start(async () => {
              setError(null);
              const result = await confirmCampaign(campaign.id);
              if (result?.error) setError(result.error);
            })
          }
        >
          {pending ? "Creating…" : "Generate campaign ✓"}
        </Button>
      </div>

      <CampaignDanger campaignId={campaign.id} campaignName={campaign.name} canArchive={false} />
    </main>
  );
}
