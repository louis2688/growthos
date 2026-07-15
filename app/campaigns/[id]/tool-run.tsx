"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { clearTodoOutput, runTodoTool } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { Todo, Tool } from "@/lib/types";

/**
 * Run control + artifact panel for one todo. Only rendered when the todo's tool
 * has a handler — a catalog-only tool gets no Run button to click.
 */
export function ToolRun({ todo, tool }: { todo: Todo; tool: Tool }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function run() {
    start(async () => {
      setError(null);
      const result = await runTodoTool(todo.id);
      if (result?.error) setError(result.error);
    });
  }

  async function copy() {
    if (!todo.output) return;
    await navigator.clipboard.writeText(todo.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={todo.output ? "outline" : "default"} disabled={pending} onClick={run}>
          <Sparkles className="size-3.5" aria-hidden />
          {pending
            ? `Running ${tool.name}…`
            : todo.output
              ? "Re-run"
              : `Run ${tool.name}`}
        </Button>
        {todo.output && !pending && (
          <>
            <Button size="sm" variant="ghost" onClick={copy}>
              {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => start(() => clearTodoOutput(todo.id, todo.campaign_id).then(() => undefined))}
            >
              Discard
            </Button>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {todo.output && (
        <details className="mt-2 rounded-xl border bg-muted/30" open>
          <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Draft from {tool.name}
          </summary>
          <p className="whitespace-pre-wrap px-3 pb-3 text-sm leading-relaxed">{todo.output}</p>
        </details>
      )}
    </div>
  );
}
