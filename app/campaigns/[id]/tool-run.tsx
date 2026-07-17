"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { clearTodoOutput, runTodoTool } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { Todo, Tool } from "@/lib/types";

/**
 * Run control + artifact panel for one todo.
 *
 * `tool` is what's assigned now — null, or one without a handler, means there's nothing
 * to run, but an artifact from an earlier tool must still be readable rather than
 * silently orphaned. `producedBy` is who actually wrote it.
 */
export function ToolRun({
  todo,
  tool,
  producedBy,
}: {
  todo: Todo;
  tool: Tool | null;
  producedBy: Tool | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runnable = tool?.handler ? tool : null;
  const stale = todo.output != null && producedBy != null && producedBy.id !== tool?.id;

  function run() {
    start(async () => {
      setError(null);
      const result = await runTodoTool(todo.id);
      if (result?.error) setError(result.error);
    });
  }

  function discard() {
    start(async () => {
      setError(null);
      const result = await clearTodoOutput(todo.id, todo.campaign_id);
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
        {runnable && (
          <Button
            size="sm"
            variant={todo.output && !stale ? "outline" : "default"}
            disabled={pending}
            onClick={run}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {pending
              ? `Running ${runnable.name}…`
              : todo.output && !stale
                ? "Re-run"
                : `Run ${runnable.name}`}
          </Button>
        )}
        {todo.output && !pending && (
          <>
            <Button size="sm" variant="ghost" onClick={copy}>
              {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={discard}>
              Discard
            </Button>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {todo.output && (
        <details className="mt-2 rounded-xl border bg-muted/30" open>
          <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Draft from {producedBy?.name ?? "a removed tool"}
            {stale && (tool ? ` — this todo now uses ${tool.name}` : " — this todo has no tool now")}
          </summary>
          {todo.output_image_url && (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL; plain
            // img avoids configuring a remote-image domain for a single bucket.
            <img
              src={todo.output_image_url}
              alt={`Generated image for “${todo.title}”`}
              className="mx-3 mb-2 max-w-full rounded-lg border"
              loading="lazy"
            />
          )}
          <p className="whitespace-pre-wrap px-3 pb-3 text-sm leading-relaxed">{todo.output}</p>
        </details>
      )}
    </div>
  );
}
