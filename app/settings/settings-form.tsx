"use client";

import { useActionState, useState, useTransition } from "react";
import { changePassword, deleteAccount, updateName, type SettingsState } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Feedback({ state, saved }: { state: SettingsState; saved: string }) {
  if (!state) return null;
  if ("error" in state) return <p className="text-sm text-destructive">{state.error}</p>;
  return <p className="text-sm text-muted-foreground">{saved}</p>;
}

export default function SettingsForm({
  email,
  name,
  credits,
}: {
  email: string;
  name: string;
  credits: { spent: number; allowance: number };
}) {
  const [nameState, nameAction, namePending] = useActionState<SettingsState, FormData>(
    updateName,
    null,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState<SettingsState, FormData>(
    changePassword,
    null,
  );
  // Controlled: the input survives React 19's automatic form reset on a failed action
  // (uncontrolled would revert to the old saved name while the error shows).
  const [nameValue, setNameValue] = useState(name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-medium">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your account and login</p>

      <section className="mt-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </h2>
        <div className="mt-2 divide-y border-t">
          <form action={nameAction} className="space-y-2 py-4">
            <Label htmlFor="name">Name</Label>
            <p className="text-[13px] text-muted-foreground">Shown in the sidebar.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="name"
                name="name"
                required
                maxLength={80}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="max-w-xs"
              />
              <Button type="submit" size="sm" disabled={namePending}>
                {namePending ? "Saving…" : "Save"}
              </Button>
            </div>
            <Feedback state={nameState} saved="Name saved" />
          </form>

          <div className="py-4">
            <Label>Email</Label>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Email changes aren&apos;t self-serve yet — write{" "}
              <a href="mailto:admin@launchlift.app" className="text-primary hover:underline">
                admin@launchlift.app
              </a>
              .
            </p>
          </div>

          <form action={passwordAction} className="space-y-2 py-4">
            <Label htmlFor="password">Password</Label>
            <p className="text-[13px] text-muted-foreground">
              At least 8 characters. If you signed up with Google, this adds an email + password
              login.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="New password"
                className="max-w-xs"
              />
              <Button type="submit" size="sm" disabled={passwordPending}>
                {passwordPending ? "Updating…" : "Update password"}
              </Button>
            </div>
            <Feedback state={passwordState} saved="Password updated" />
          </form>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          AI credits this month
        </h2>
        <div className="mt-2 rounded-lg border p-4">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-xl font-medium">
              {credits.allowance - credits.spent}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                of {credits.allowance} left
              </span>
            </p>
            <p className="text-[13px] text-muted-foreground">Resets on the 1st</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, (credits.spent / credits.allowance) * 100)}%` }}
            />
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Every AI action draws from this pool: campaign generation 10 · launch timing 5 ·
            regenerate 2 · images 2 · post, SEO, and email writers 1 · UTM builder free. Paid
            plans and top-ups arrive with billing.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-destructive">
          Danger zone
        </h2>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4">
          <div>
            <p className="text-sm font-medium">Delete account</p>
            <p className="text-[13px] text-muted-foreground">
              Removes your campaigns, generated images, and login. This can&apos;t be undone.
            </p>
          </div>
          <Dialog
            open={deleteOpen}
            onOpenChange={(open) => {
              // Once "Delete my account" is clicked there is nothing left to cancel — the
              // server action can't be aborted. Refusing dismissal keeps the dialog honest
              // instead of letting Cancel LOOK like it stopped an unstoppable deletion.
              if (deleting) return;
              setDeleteOpen(open);
              if (open) setDeleteError(null); // don't resurface a stale error on reopen
            }}
          >
            <DialogTrigger render={<Button variant="destructive" size="sm" />}>
              Delete…
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm" showCloseButton={!deleting}>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Everything goes: campaigns, plans, todos, generated images, and your login for{" "}
                <span className="font-medium text-foreground">{email}</span>. There is no undo.
              </p>
              {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" disabled={deleting} />}>
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={() =>
                    startDelete(async () => {
                      setDeleteError(null);
                      const result = await deleteAccount();
                      if (result?.error) setDeleteError(result.error);
                    })
                  }
                >
                  {deleting ? "Deleting…" : "Delete my account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </main>
  );
}
