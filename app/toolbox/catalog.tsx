"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Tool, ToolCategory, ToolIntegration, ToolStatus } from "@/lib/types";

export type ToolUsage = { plans: number; todos: number };

const CATEGORIES: (ToolCategory | "all")[] = [
  "all",
  "ai",
  "marketing",
  "content",
  "analytics",
  "outreach",
];

const categoryIcon: Record<ToolCategory, string> = {
  ai: "bg-primary text-primary-foreground",
  marketing: "bg-brand-indigo text-white",
  content: "bg-emerald-600 text-white",
  analytics: "bg-brand-pink text-white",
  outreach: "bg-amber-600 text-white",
};

// Badge defaults to variant="default" (bg-primary), so every tone must set its own
// background — otherwise the text sits on brand purple and is unreadable.
const statusBadge: Record<ToolStatus, string> = {
  active: "border-transparent bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  beta: "border-transparent bg-primary/10 text-primary",
  disabled: "border-transparent bg-muted-foreground/15 text-muted-foreground",
};

const integrationLabel: Record<ToolIntegration, string> = {
  internal: "Internal",
  api: "API integration",
  "link-out": "Link-out",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** What this tool can actually do today — the card and dialog both key off this. */
function availability(tool: Tool): { label: string; tone: string; detail: string } {
  if (tool.status === "disabled") {
    return {
      label: "Disabled",
      tone: "border-transparent bg-muted-foreground/15 text-muted-foreground",
      detail: "This tool is switched off in the catalog and won't be suggested for any plan.",
    };
  }
  if (tool.handler) {
    return {
      label: "Ready to run",
      tone: "border-transparent bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
      detail:
        "Open a todo this tool is assigned to and press Run — the draft is saved onto that todo.",
    };
  }
  if (tool.integration_type === "link-out") {
    return {
      label: "Opens externally",
      tone: "border-transparent bg-sky-600/10 text-sky-700 dark:text-sky-400",
      detail: "This one hands off to an external site — GrowthOS just points you at it.",
    };
  }
  return {
    label: "Not built yet",
    tone: "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
    detail:
      tool.integration_type === "api"
        ? "The AI can suggest this tool and assign it to todos, but connecting it to its API isn't built yet — for now you'd do this step by hand."
        : "The AI can suggest this tool and assign it to todos, but nothing runs it yet — for now you'd do this step by hand.",
  };
}

function ToolDialog({
  tool,
  usage,
  onOpenChange,
}: {
  tool: Tool;
  usage: ToolUsage;
  onOpenChange: (open: boolean) => void;
}) {
  const state = availability(tool);
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {tool.name}
            <Badge className={statusBadge[tool.status]}>{tool.status}</Badge>
          </DialogTitle>
          <DialogDescription>{tool.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{tool.category}</Badge>
            <Badge variant="secondary">{integrationLabel[tool.integration_type]}</Badge>
            <Badge className={state.tone}>{state.label}</Badge>
          </div>

          <p className="text-sm text-muted-foreground">{state.detail}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-3">
              <p className="font-heading text-2xl font-bold tabular-nums">{usage.plans}</p>
              <p className="text-xs text-muted-foreground">
                {usage.plans === 1 ? "plan suggests it" : "plans suggest it"}
              </p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="font-heading text-2xl font-bold tabular-nums">{usage.todos}</p>
              <p className="text-xs text-muted-foreground">
                {usage.todos === 1 ? "todo assigned" : "todos assigned"}
              </p>
            </div>
          </div>

          {tool.url && (
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-xs text-muted-foreground underline"
            >
              {tool.url}
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Catalog({
  tools,
  usage,
}: {
  tools: Tool[];
  usage: Record<string, ToolUsage>;
}) {
  const [category, setCategory] = useState<ToolCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Tool | null>(null);

  const term = search.trim().toLowerCase();
  const filtered = tools.filter((t) => {
    const matchCat = category === "all" || t.category === category;
    const matchSearch =
      !term || t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term);
    return matchCat && matchSearch;
  });

  const stats = [
    { k: "Total", v: tools.length },
    { k: "Ready to run", v: tools.filter((t) => t.handler && t.status !== "disabled").length },
    { k: "Beta", v: tools.filter((t) => t.status === "beta").length },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Toolbox</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            AI and marketing tools available across every campaign. The AI picks from these when it
            builds your plans — the ones marked ready to run can do the work too.
          </p>
        </div>
        <div className="flex gap-3">
          {stats.map((s) => (
            <div key={s.k} className="glass rounded-xl border px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.k}
              </p>
              <p className="font-heading text-xl font-bold tabular-nums">{s.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass mb-4 flex flex-wrap items-center gap-3 rounded-2xl border p-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools…"
          aria-label="Search tools"
          className="max-w-xs flex-1"
        />
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <Button
              key={c}
              size="sm"
              className="rounded-full text-[11px] uppercase tracking-wider"
              variant={category === c ? "default" : "outline"}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-[11px] uppercase tracking-wider text-muted-foreground">
        {filtered.length} of {tools.length} tools
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tool) => {
          const state = availability(tool);
          const u = usage[tool.id] ?? { plans: 0, todos: 0 };
          return (
            <article key={tool.id} className="glass flex flex-col rounded-2xl border p-4">
              <div className="flex gap-3">
                {/* Disabled reads through the muted icon and badge, not a blanket
                    opacity — dimming the card made its body copy unreadable. */}
                <div
                  aria-hidden
                  className={`flex size-11 flex-none items-center justify-center rounded-xl font-heading font-bold ${
                    tool.status === "disabled"
                      ? "bg-muted text-muted-foreground"
                      : categoryIcon[tool.category]
                  }`}
                >
                  {initials(tool.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="font-heading font-semibold leading-tight">{tool.name}</h2>
                    <Badge className={statusBadge[tool.status]}>{tool.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {tool.category}
                  </p>
                </div>
              </div>

              <p className="mt-3 flex-1 text-sm text-muted-foreground">{tool.description}</p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge className={state.tone}>{state.label}</Badge>
                {u.todos > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    on {u.todos} {u.todos === 1 ? "todo" : "todos"}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {integrationLabel[tool.integration_type]}
                </span>
                <div className="flex gap-1.5">
                  {tool.url && tool.status !== "disabled" && (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
                    >
                      Open ↗
                    </a>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setOpen(tool)}>
                    Details
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            No tools match your search.
          </p>
        )}
      </div>

      {open && (
        <ToolDialog
          tool={open}
          usage={usage[open.id] ?? { plans: 0, todos: 0 }}
          onOpenChange={(o) => !o && setOpen(null)}
        />
      )}
    </main>
  );
}
