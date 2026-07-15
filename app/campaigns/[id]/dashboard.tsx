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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Campaign, Channel, Todo, TodoPriority } from "@/lib/types";
import { AddTodoDialog, EditTodoDialog } from "./todo-dialogs";

// Soft pills per design-system/MASTER.md (not solid badge variants)
const priorityPill: Record<TodoPriority, string> = {
  high: "border-transparent bg-destructive/10 text-destructive",
  medium: "border-transparent bg-primary/10 text-primary",
  low: "border-transparent bg-muted-foreground/15 text-muted-foreground",
};

export default function Dashboard({
  campaign,
  channels,
  todos,
}: {
  campaign: Campaign;
  channels: Channel[];
  todos: Todo[];
}) {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [editing, setEditing] = useState<Todo | null>(null);
  const [, startTransition] = useTransition();
  const [regenPending, startRegen] = useTransition();
  const [regenError, setRegenError] = useState<string | null>(null);

  const channelName = new Map(channels.map((c) => [c.id, c.name]));
  const visible =
    activeChannel === "all" ? todos : todos.filter((t) => t.channel_id === activeChannel);
  const done = todos.filter((t) => t.status === "done").length;
  const pct = todos.length === 0 ? 0 : Math.round((done / todos.length) * 100);
  const perChannel = channels.map((c) => {
    const ts = todos.filter((t) => t.channel_id === c.id);
    return {
      id: c.id,
      name: c.name,
      done: ts.filter((t) => t.status === "done").length,
      total: ts.length,
    };
  });
  const nextUp = todos
    .filter((t) => t.status !== "done")
    .toSorted((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))[0];

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All campaigns
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{campaign.title}</h1>
          <p className="mt-1 text-muted-foreground">{campaign.goal}</p>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            {/* Base UI: render prop replaces Radix asChild */}
            <AlertDialogTrigger
              render={<Button variant="outline" size="sm" disabled={regenPending} />}
            >
              {regenPending ? "Regenerating… this takes a minute or two" : "Regenerate"}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate this campaign?</AlertDialogTitle>
                <AlertDialogDescription>
                  The AI will rebuild the plan from your original answers. This replaces ALL
                  channels and todos — including ones you added or edited yourself. This cannot
                  be undone.
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
        </div>
      </div>

      {regenError && <p className="mb-4 text-sm text-destructive">{regenError}</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_264px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap gap-2">
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

      <div className="mb-6">
        <AddTodoDialog campaignId={campaign.id} channels={channels} />
      </div>

      <ul className="space-y-2">
        {visible.map((todo) => (
          <li
            key={todo.id}
            className="glass flex items-start gap-3 rounded-xl border p-3.5 transition-colors hover:border-primary/40"
            data-status={todo.status}
          >
            <Checkbox
              className="mt-1"
              checked={todo.status === "done"}
              onCheckedChange={(checked) =>
                startTransition(() =>
                  updateTodo({
                    id: todo.id,
                    campaign_id: todo.campaign_id,
                    status: checked ? "done" : "todo",
                  }),
                )
              }
            />
            <div
              className="min-w-0 flex-1 cursor-pointer"
              onClick={() => setEditing(todo)}
              title="Click to edit"
            >
              <p className={todo.status === "done" ? "line-through text-muted-foreground" : ""}>
                {todo.title}
              </p>
              {todo.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">{todo.description}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                {activeChannel === "all" && (
                  <Badge variant="outline">{channelName.get(todo.channel_id)}</Badge>
                )}
                <Badge className={priorityPill[todo.priority]}>{todo.priority}</Badge>
                {todo.tool && <Badge variant="secondary">{todo.tool}</Badge>}
                {todo.status === "in_progress" && (
                  <Badge className="border-transparent bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
                    in progress
                  </Badge>
                )}
                {todo.due_date && (
                  <span className="tabular-nums text-muted-foreground">due {todo.due_date}</span>
                )}
              </div>
            </div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="text-muted-foreground">No todos in this channel.</li>
        )}
      </ul>
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
              By channel
            </h4>
            {perChannel.map((c) => (
              <div
                key={c.id}
                className="mb-2.5 grid grid-cols-[86px_1fr_34px] items-center gap-2 text-xs text-muted-foreground last:mb-0"
              >
                <span className="truncate">{c.name}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-primary to-brand-pink"
                    style={{ width: c.total === 0 ? 0 : `${(c.done / c.total) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">
                  {c.done}/{c.total}
                </span>
              </div>
            ))}
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

      {editing && (
        <EditTodoDialog
          todo={editing}
          channels={channels}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
    </main>
  );
}
