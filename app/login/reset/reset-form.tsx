"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePassword, type UpdatePasswordState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetForm() {
  const [state, formAction, pending] = useActionState<UpdatePasswordState, FormData>(
    updatePassword,
    null,
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Choose a new password</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        You&apos;ll be signed in right after.
      </p>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••••"
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "One moment…" : "Set new password"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Link not working?{" "}
        <Link href="/login/forgot" className="font-semibold text-primary hover:underline">
          Request a new one
        </Link>
      </p>
    </div>
  );
}
