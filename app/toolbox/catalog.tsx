"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tool, ToolCategory, ToolIntegration, ToolStatus } from "@/lib/types";

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

const statusBadge: Record<ToolStatus, string> = {
  active: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  beta: "border-primary/40 bg-primary/10 text-primary",
  disabled: "border-muted-foreground/30 text-muted-foreground",
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

function ActionButton({ tool }: { tool: Tool }) {
  if (tool.status === "disabled") {
    return (
      <Button size="sm" variant="outline" disabled>
        Disabled
      </Button>
    );
  }
  if (tool.integration_type === "api") return <Button size="sm">Connect</Button>;
  if (tool.integration_type === "link-out") {
    return (
      <Button size="sm" variant="secondary">
        Open ↗
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline">
      Configure
    </Button>
  );
}

export default function Catalog({ tools }: { tools: Tool[] }) {
  const [category, setCategory] = useState<ToolCategory | "all">("all");
  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();
  const filtered = tools.filter((t) => {
    const matchCat = category === "all" || t.category === category;
    const matchSearch =
      !term || t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term);
    return matchCat && matchSearch;
  });

  const stats = [
    { k: "Total", v: tools.length },
    { k: "Active", v: tools.filter((t) => t.status === "active").length },
    { k: "Beta", v: tools.filter((t) => t.status === "beta").length },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Toolbox</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            AI and marketing tools available across every campaign. Browse, search, and connect —
            independent of any single plan.
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
        {filtered.map((tool) => (
          <article
            key={tool.id}
            className={`glass flex flex-col rounded-2xl border p-4 ${
              tool.status === "disabled" ? "opacity-60" : ""
            }`}
          >
            <div className="flex gap-3">
              <div
                aria-hidden
                className={`flex size-11 flex-none items-center justify-center rounded-xl font-heading font-bold ${categoryIcon[tool.category]}`}
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

            <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {integrationLabel[tool.integration_type]}
              </span>
              <ActionButton tool={tool} />
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            No tools match your search.
          </p>
        )}
      </div>
    </main>
  );
}
