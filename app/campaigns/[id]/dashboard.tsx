"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { regenerateCampaign, updateTodo } from "@/app/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  Campaign,
  Channel,
  Goal,
  Plan,
  PlanStatus,
  PlanTool,
  Priority,
  Todo,
  Tool,
} from "@/lib/types";
import { goalSeed } from "@/lib/wizard";
import { CampaignDanger } from "@/components/campaign-danger";
import { AddTodoDialog, EditTodoDialog } from "./todo-dialogs";
import { ToolRun } from "./tool-run";

const priorityPill: Record<Priority, string> = {
  high: "border-transparent bg-destructive/10 text-destructive",
  medium: "border-transparent bg-primary/10 text-primary",
  low: "border-transparent bg-muted-foreground/15 text-muted-foreground",
};

const planStatusPill: Record<PlanStatus, string> = {
  active: "border-transparent bg-emerald-600/10 text-emerald-600 dark:text-emerald-400",
  planned: "border-transparent bg-muted-foreground/15 text-muted-foreground",
  archived: "border-transparent bg-muted-foreground/15 text-muted-foreground line-through",
};

const toolTag = "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400";

const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export default function Dashboard({
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
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [editing, setEditing] = useState<Todo | null>(null);
  const [, startTransition] = useTransition();
  const [regenPending, startRegen] = useTransition();
  const [regenError, setRegenError] = useState<string | null>(null);

  const channelName = new Map(channels.map((c) => [c.id, c.name]));
  const toolById = new Map(tools.map((t) => [t.id, t]));
  const todosByPlan = new Map<string, Todo[]>();
  for (const t of todos) {
    todosByPlan.set(t.plan_id, [...(todosByPlan.get(t.plan_id) ?? []), t]);
  }

  const sortedPlans = [...plans].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  const visiblePlans =
    activeChannel === "all" ? sortedPlans : sortedPlans.filter((p) => p.channel_id === activeChannel);

  const done = todos.filter((t) => t.status === "done").length;
  const pct = todos.length === 0 ? 0 : Math.round((done / todos.length) * 100);
  const nextUp = todos
    .filter((t) => t.status !== "done")
    .toSorted((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))[0];

  const goalLine = goalSeed(goal);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All campaigns
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="mt-1 text-muted-foreground">{goalLine}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/campaigns/${campaign.id}/board`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Board
          </Link>
          <Link
            href={`/new?from=${campaign.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            title="Start a new campaign seeded with this one's product and goal"
          >
            New from this
          </Link>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="outline" size="sm" disabled={regenPending} />}
            >
              {regenPending ? "Regenerating… this takes a minute or two" : "Regenerate"}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate this campaign?</AlertDialogTitle>
                <AlertDialogDescription>
                  The AI rebuilds every plan, todo and tool suggestion from your goal and selected
                  channels. This replaces ALL plans and todos — including ones you added or edited
                  yourself. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    startRegen(async () => {
                      setRegenError(null);
                      const result = await regenerateCampaign(campaign.id);
                      if (result?.error) setRegenError(result.error);
                      else router.refresh();
                    })
                  }
                >
                  Regenerate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AddTodoDialog campaignId={campaign.id} plans={plans} tools={tools} />
        </div>
      </div>

      {regenError && <p className="mb-4 text-sm text-destructive">{regenError}</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_264px]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="rounded-full"
              variant={activeChannel === "all" ? "default" : "outline"}
              onClick={() => setActiveChannel("all")}
            >
              All
            </Button>
            {channels.map((c) => (
              <Button
                key={c.id}
                size="sm"
                className="rounded-full"
                variant={activeChannel === c.id ? "default" : "outline"}
                onClick={() => setActiveChannel(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>

          <div className="space-y-6">
            {visiblePlans.map((plan) => {
              const planTodos = todosByPlan.get(plan.id) ?? [];
              const planDone = planTodos.filter((t) => t.status === "done").length;
              const suggested = planTools.filter((pt) => pt.plan_id === plan.id);
              return (
                <section key={plan.id} className="glass rounded-2xl border p-4">
                  <header className="mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-lg font-semibold">{plan.title}</h2>
                      <Badge variant="outline">{channelName.get(plan.channel_id)}</Badge>
                      <Badge className={planStatusPill[plan.status]}>{plan.status}</Badge>
                      <Badge className={priorityPill[plan.priority]}>{plan.priority}</Badge>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {planDone}/{planTodos.length} done
                      </span>
                    </div>
                    {plan.objective && (
                      <p className="mt-1 text-sm text-muted-foreground">{plan.objective}</p>
                    )}
                  </header>

                  <ul className="space-y-2">
                    {planTodos.map((todo) => {
                      const tool = todo.tool_id ? toolById.get(todo.tool_id) : null;
                      return (
                        <li
                          key={todo.id}
                          className="flex items-start gap-3 rounded-xl border bg-card/60 p-3"
                          data-status={todo.status}
                        >
                          <Checkbox
                            className="mt-1"
                            checked={todo.status === "done"}
                            aria-label={`Mark ${todo.title} done`}
                            onCheckedChange={(checked) =>
                              startTransition(() =>
                                updateTodo({
                                  id: todo.id,
                                  campaign_id: todo.campaign_id,
                                  status: checked ? "done" : "backlog",
                                }),
                              )
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="cursor-pointer" onClick={() => setEditing(todo)} title="Click to edit">
                              <p
                                className={
                                  todo.status === "done" ? "line-through text-muted-foreground" : ""
                                }
                              >
                                {todo.title}
                              </p>
                              {todo.description && (
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  {todo.description}
                                </p>
                              )}
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                                <Badge className={priorityPill[todo.priority]}>{todo.priority}</Badge>
                                {todo.status === "in_progress" && (
                                  <Badge className="border-transparent bg-primary/10 text-primary">
                                    in progress
                                  </Badge>
                                )}
                                {todo.status === "review" && (
                                  <Badge className="border-transparent bg-sky-600/10 text-sky-600 dark:text-sky-400">
                                    review
                                  </Badge>
                                )}
                                {tool && <Badge className={toolTag}>{tool.name}</Badge>}
                                {todo.estimated_time && (
                                  <span className="text-muted-foreground">~{todo.estimated_time}</span>
                                )}
                                {todo.due_date && (
                                  <span className="tabular-nums text-muted-foreground">
                                    due {todo.due_date}
                                  </span>
                                )}
                              </div>
                            </div>
                            {(tool?.handler || todo.output) && (
                              <ToolRun
                                todo={todo}
                                tool={tool ?? null}
                                producedBy={
                                  todo.output_tool_id
                                    ? (toolById.get(todo.output_tool_id) ?? null)
                                    : null
                                }
                              />
                            )}
                          </div>
                        </li>
                      );
                    })}
                    {planTodos.length === 0 && (
                      <li className="text-sm text-muted-foreground">No todos in this plan.</li>
                    )}
                  </ul>

                  {suggested.length > 0 && (
                    <div className="mt-3 rounded-xl border border-dashed p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Suggested tools
                      </p>
                      <div className="space-y-1.5">
                        {suggested.map((pt) => (
                          <div key={pt.id} className="flex flex-wrap items-baseline gap-2 text-xs">
                            <Badge className={toolTag}>{toolById.get(pt.tool_id)?.name}</Badge>
                            <span className="flex-1 text-muted-foreground">{pt.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
            {visiblePlans.length === 0 && (
              <p className="text-muted-foreground">No plans for this channel.</p>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="glass rounded-2xl border p-4">
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Progress
            </h4>
            <div className="flex items-center gap-3.5">
              <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${pct} percent complete`}>
                <circle cx="32" cy="32" r="26" fill="none" className="stroke-primary/15" strokeWidth="8" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 163.4} 163.4`}
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <div>
                <p className="font-heading text-xl font-bold tabular-nums">
                  {done}/{todos.length}
                </p>
                <p className="text-xs text-muted-foreground">todos done · {pct}%</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl border p-4">
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              By plan
            </h4>
            {sortedPlans.map((p) => {
              const ts = todosByPlan.get(p.id) ?? [];
              const d = ts.filter((t) => t.status === "done").length;
              return (
                <div
                  key={p.id}
                  className="mb-2.5 grid grid-cols-[96px_1fr_34px] items-center gap-2 text-xs text-muted-foreground last:mb-0"
                >
                  <span className="truncate" title={p.title}>
                    {p.title}
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: ts.length === 0 ? 0 : `${(d / ts.length) * 100}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums">
                    {d}/{ts.length}
                  </span>
                </div>
              );
            })}
          </div>

          {nextUp && (
            <div className="glass rounded-2xl border p-4">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Next up
              </h4>
              <p className="text-sm font-medium">{nextUp.title}</p>
              {nextUp.due_date && (
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">due {nextUp.due_date}</p>
              )}
            </div>
          )}
        </aside>
      </div>

      <CampaignDanger campaignId={campaign.id} campaignName={campaign.name} />

      {editing && (
        <EditTodoDialog
          todo={editing}
          plans={plans}
          tools={tools}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
    </main>
  );
}
