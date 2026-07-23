"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ResetRequestState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Turnstile from "@/components/turnstile";

export default function ForgotForm() {
  const [state, formAction, pending] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    null,
  );
  const values = state && "email" in state ? state : null;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Reset your password</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        We&apos;ll email you a link to set a new one.
      </p>

      {state && "sent" in state ? (
        <div className="rounded-xl border bg-primary/5 p-4 text-sm" role="status">
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-muted-foreground">
            If an account exists for {state.sent}, a reset link is on its way.
          </p>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@startup.com"
              defaultValue={values?.email ?? ""}
            />
          </div>

          {values?.error && (
            <p role="alert" className="text-sm text-destructive">
              {values.error}
            </p>
          )}

          <Turnstile resetOn={values?.error} />

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "One moment…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
