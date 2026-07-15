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
import type { Channel, Todo, TodoPriority, TodoStatus } from "@/lib/types";

function TodoFields({
  channels,
  defaults,
  withStatus,
}: {
  channels: Channel[];
  defaults?: Partial<Todo>;
  withStatus?: boolean;
}) {
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
          <Label>Channel</Label>
          <Select name="channel_id" defaultValue={defaults?.channel_id ?? channels[0]?.id}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channels.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
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
          <Label htmlFor="tool">Tool</Label>
          <Input id="tool" name="tool" defaultValue={defaults?.tool ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" name="due_date" type="date" defaultValue={defaults?.due_date ?? ""} />
        </div>
        {withStatus && (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select name="status" defaultValue={defaults?.status ?? "todo"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">todo</SelectItem>
                <SelectItem value="in_progress">in progress</SelectItem>
                <SelectItem value="done">done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

function readFields(form: FormData) {
  return {
    title: String(form.get("title") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
    channel_id: String(form.get("channel_id") ?? ""),
    priority: String(form.get("priority") ?? "medium") as TodoPriority,
    tool: String(form.get("tool") ?? "").trim() || null,
    due_date: String(form.get("due_date") ?? "") || null,
  };
}

export function EditTodoDialog({
  todo,
  channels,
  open,
  onOpenChange,
}: {
  todo: Todo;
  channels: Channel[];
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
          <TodoFields channels={channels} defaults={todo} withStatus />
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
  channels,
}: {
  campaignId: string;
  channels: Channel[];
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
          <TodoFields channels={channels} />
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
