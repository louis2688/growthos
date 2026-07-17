"use client";

import { useState, useTransition } from "react";
import { archiveCampaign, deleteCampaign } from "@/app/actions";
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
import { Button } from "@/components/ui/button";

/**
 * Archive and delete, deliberately kept away from the day-to-day controls in the header.
 * Destructive actions shouldn't sit next to the button you press every day.
 *
 * `canArchive` is false in the wizard: archiving a half-finished campaign would strand it,
 * because restore always returns a campaign to 'active' and an unfinished one has no plans.
 * There, delete is the only honest way out — hence the different label.
 */
export function CampaignDanger({
  campaignId,
  campaignName,
  canArchive = true,
}: {
  campaignId: string;
  campaignName: string;
  canArchive?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-10 border-t pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground">
          {canArchive
            ? "Done with this campaign?"
            : "Don't want to finish setting this up?"}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {canArchive && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const result = await archiveCampaign(campaignId);
                  if (result?.error) setError(result.error);
                })
              }
            >
              {pending ? "Working…" : "Archive"}
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                />
              }
            >
              {canArchive ? "Delete" : "Discard campaign"}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{campaignName}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the campaign and everything in it — its goal,
                  channels, plans, todos, and any drafts a tool wrote for you. It cannot be
                  undone.
                  {canArchive && " If you just want it off your list, archive it instead."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    start(async () => {
                      setError(null);
                      const result = await deleteCampaign(campaignId);
                      if (result?.error) setError(result.error);
                    })
                  }
                >
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {error && <p className="mt-2 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
