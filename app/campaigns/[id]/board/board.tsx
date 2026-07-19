"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { updateTodo } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TODO_STATUSES,
  type Campaign,
  type Channel,
  type Plan,
  type Todo,
  type TodoStatus,
  type Tool,
} from "@/lib/types";

// Column headers use Title Case; the per-card dropdown reuses the shared lowercase labels.
const COLUMN_LABEL: Record<TodoStatus, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

const COLUMN_HEAD: Record<TodoStatus, string> = {
  backlog: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  review: "bg-sky-600/10 text-sky-600 dark:text-sky-400",
  done: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400",
};

const ALL = "all";

export default function Board({
  campaign,
  channels,
  plans,
  todos,
  tools,
}: {
  campaign: Campaign;
  channels: Channel[];
  plans: Plan[];
  todos: Todo[];
  tools: Tool[];
}) {
  const [channelFilter, setChannelFilter] = useState(ALL);
  const [planFilter, setPlanFilter] = useState(ALL);
  const [, startTransition] = useTransition();

  const planById = new Map(plans.map((p) => [p.id, p]));
  const channelById = new Map(channels.map((c) => [c.id, c]));
  const toolById = new Map(tools.map((t) => [t.id, t]));

  // Narrowing the channel narrows which plans are selectable, as in the prototype.
  const plansForChannel =
    channelFilter === ALL ? plans : plans.filter((p) => p.channel_id === channelFilter);

  const visible = useMemo(
    () =>
      todos.filter((t) => {
        const plan = planById.get(t.plan_id);
        if (!plan) return false;
        if (channelFilter !== ALL && plan.channel_id !== channelFilter) return false;
        if (planFilter !== ALL && t.plan_id !== planFilter) return false;
        return true;
      }),
    // planById is rebuilt each render from props; todos/filters are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos, channelFilter, planFilter],
  );

  function move(todo: Todo, status: TodoStatus) {
    startTransition(() => updateTodo({ id: todo.id, campaign_id: todo.campaign_id, status }));
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-2">
        <Link href={`/campaigns/${campaign.id}`} className="text-sm text-muted-foreground hover:underline">
          ← {campaign.name}
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Todo board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every todo across every plan, grouped by status. Filter to one channel or plan to focus.
          </p>
        </div>
        <Link
          href={`/campaigns/${campaign.id}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Plans view
        </Link>
      </div>

      <div className="glass mb-6 flex flex-wrap items-end gap-4 rounded-2xl border p-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Channel</Label>
          <Select
            value={channelFilter}
            items={[
              { value: ALL, label: "All channels" },
              ...channels.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onValueChange={(v) => {
              setChannelFilter(String(v));
              setPlanFilter(ALL); // a stale plan pick would hide every todo
            }}
          >
            <SelectTrigger className="min-w-[180px]">
              <SelectValue className="block! truncate!" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All channels</SelectItem>
              {channels.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Plan</Label>
          <Select
            value={planFilter}
            items={[
              { value: ALL, label: "All plans" },
              ...plansForChannel.map((p) => ({ value: p.id, label: p.title })),
            ]}
            onValueChange={(v) => setPlanFilter(String(v))}
          >
            <SelectTrigger className="min-w-[180px]">
              <SelectValue className="block! truncate!" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All plans</SelectItem>
              {plansForChannel.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          className={buttonVariants({ variant: "outline", size: "sm" })}
          onClick={() => {
            setChannelFilter(ALL);
            setPlanFilter(ALL);
          }}
        >
          Clear filters
        </button>

        <span className="ml-auto text-xs uppercase tracking-wider text-muted-foreground">
          <strong className="text-foreground tabular-nums">{visible.length}</strong> / {todos.length}{" "}
          todos
        </span>
      </div>

      <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TODO_STATUSES.map((status) => {
          const column = visible.filter((t) => t.status === status);
          return (
            <section key={status} className="glass overflow-hidden rounded-2xl border">
              <header
                className={`flex items-center justify-between border-b px-3 py-2.5 text-xs font-semibold uppercase tracking-wider ${COLUMN_HEAD[status]}`}
              >
                <span>{COLUMN_LABEL[status]}</span>
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 tabular-nums">
                  {column.length}
                </span>
              </header>
              <div className="flex flex-col gap-2.5 p-3">
                {column.map((todo) => {
                  const plan = planById.get(todo.plan_id);
                  const channel = plan ? channelById.get(plan.channel_id) : null;
                  const tool = todo.tool_id ? toolById.get(todo.tool_id) : null;
                  return (
                    <article key={todo.id} className="rounded-xl border bg-card/60 p-3">
                      <p className="text-sm font-medium">{todo.title}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {channel && <Badge variant="outline">{channel.name}</Badge>}
                        {plan && <Badge variant="secondary">{plan.title}</Badge>}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {tool ? (
                          <Badge className="border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                            {tool.name}
                          </Badge>
                        ) : (
                          <span className="text-[11px] italic text-muted-foreground">no tool</span>
                        )}
                        <Select
                          value={status}
                          items={TODO_STATUSES.map((s) => ({ value: s, label: COLUMN_LABEL[s] }))}
                          onValueChange={(v) => move(todo, String(v) as TodoStatus)}
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-7 w-auto gap-1 text-[11px]"
                            aria-label={`Move ${todo.title}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TODO_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {COLUMN_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </article>
                  );
                })}
                {column.length === 0 && (
                  <p className="rounded-lg border border-dashed py-5 text-center text-xs text-muted-foreground">
                    No todos
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
