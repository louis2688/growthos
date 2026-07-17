"use client";

import { useState, useTransition } from "react";
import { deleteCampaign, restoreCampaign } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { Campaign } from "@/lib/types";

/**
 * Archived campaigns are hidden from the main list, so without this they'd be gone with no
 * way back — archive would be a one-way trap. Restore always returns them to 'active',
 * which is safe because only an active campaign can be archived in the first place.
 */
export function ArchivedCampaigns({ campaigns }: { campaigns: Campaign[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (campaigns.length === 0) return null;

  return (
    <details className="mt-8" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Archived ({campaigns.length})
      </summary>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <ul className="mt-3 space-y-2">
        {campaigns.map((c) => (
          <li
            key={c.id}
            className="glass flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm"
          >
            <span className="font-medium">{c.name}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {c.description}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const result = await restoreCampaign(c.id);
                  if (result?.error) setError(result.error);
                })
              }
            >
              Restore
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() =>
                start(async () => {
                  setError(null);
                  const result = await deleteCampaign(c.id);
                  if (result?.error) setError(result.error);
                })
              }
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </details>
  );
}
