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

const priorityVariant: Record<TodoPriority, "destructive" | "default" | "secondary"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All campaigns
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{campaign.title}</h1>
          <p className="mt-1 text-muted-foreground">{campaign.goal}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {done}/{todos.length} done · {pct}%
          </Badge>
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

      {regenError && <p className="mb-4 text-sm text-red-600">{regenError}</p>}

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={activeChannel === "all" ? "default" : "outline"}
          onClick={() => setActiveChannel("all")}
        >
          All
        </Button>
        {channels.map((c) => (
          <Button
            key={c.id}
            size="sm"
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
            className="flex items-start gap-3 rounded-lg border p-3"
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
                <Badge variant={priorityVariant[todo.priority]}>{todo.priority}</Badge>
                {todo.tool && <Badge variant="secondary">{todo.tool}</Badge>}
                {todo.status === "in_progress" && <Badge>in progress</Badge>}
                {todo.due_date && (
                  <span className="text-muted-foreground">due {todo.due_date}</span>
                )}
              </div>
            </div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="text-muted-foreground">No todos in this channel.</li>
        )}
      </ul>

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
