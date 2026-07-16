"use client";

import { useState, useTransition } from "react";
import { addTodo, updateTodo } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TODO_STATUSES,
  TODO_STATUS_LABEL,
  type Plan,
  type Priority,
  type Todo,
  type TodoStatus,
  type Tool,
} from "@/lib/types";

const NO_TOOL = "none";

function TodoFields({
  plans,
  tools,
  defaults,
  withStatus,
}: {
  plans: Plan[];
  tools: Tool[];
  defaults?: Partial<Todo>;
  withStatus?: boolean;
}) {
  // A disabled tool can't be assigned, but keep one already on the todo so editing
  // an unrelated field doesn't silently drop it.
  const selectableTools = tools.filter((t) => t.status !== "disabled" || t.id === defaults?.tool_id);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={defaults?.title ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Plan</Label>
          {/* items maps id -> title; without it Base UI renders the raw uuid in the trigger. */}
          <Select
            name="plan_id"
            defaultValue={defaults?.plan_id ?? plans[0]?.id}
            items={plans.map((p) => ({ value: p.id, label: p.title }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select name="priority" defaultValue={defaults?.priority ?? "medium"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">high</SelectItem>
              <SelectItem value="medium">medium</SelectItem>
              <SelectItem value="low">low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tool</Label>
          <Select
            name="tool_id"
            defaultValue={defaults?.tool_id ?? NO_TOOL}
            items={[
              { value: NO_TOOL, label: "No tool" },
              ...selectableTools.map((t) => ({ value: t.id, label: t.name })),
            ]}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TOOL}>No tool</SelectItem>
              {selectableTools.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="estimated_time">Estimated time</Label>
          <Input
            id="estimated_time"
            name="estimated_time"
            placeholder="e.g. 2 hours"
            defaultValue={defaults?.estimated_time ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" name="due_date" type="date" defaultValue={defaults?.due_date ?? ""} />
        </div>
        {withStatus && (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              name="status"
              defaultValue={defaults?.status ?? "backlog"}
              items={TODO_STATUSES.map((s) => ({ value: s, label: TODO_STATUS_LABEL[s] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TODO_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TODO_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

function readFields(form: FormData) {
  const toolId = String(form.get("tool_id") ?? NO_TOOL);
  return {
    title: String(form.get("title") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
    plan_id: String(form.get("plan_id") ?? ""),
    priority: String(form.get("priority") ?? "medium") as Priority,
    tool_id: toolId === NO_TOOL ? null : toolId,
    estimated_time: String(form.get("estimated_time") ?? "").trim() || null,
    due_date: String(form.get("due_date") ?? "") || null,
  };
}

export function EditTodoDialog({
  todo,
  plans,
  tools,
  open,
  onOpenChange,
}: {
  todo: Todo;
  plans: Plan[];
  tools: Tool[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const fields = readFields(form);
    startTransition(async () => {
      await updateTodo({
        id: todo.id,
        campaign_id: todo.campaign_id,
        ...fields,
        status: String(form.get("status") ?? todo.status) as TodoStatus,
      });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit todo</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <TodoFields plans={plans} tools={tools} defaults={todo} withStatus />
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddTodoDialog({
  campaignId,
  plans,
  tools,
}: {
  campaignId: string;
  plans: Plan[];
  tools: Tool[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = readFields(new FormData(e.currentTarget));
    startTransition(async () => {
      await addTodo({ campaign_id: campaignId, ...fields });
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Base UI: render prop replaces Radix asChild */}
      <DialogTrigger render={<Button variant="outline" />}>Add todo</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add todo</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <TodoFields plans={plans} tools={tools} />
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
