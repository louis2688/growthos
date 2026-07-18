"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signInWithGoogle, type AuthState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const signup = mode === "signup";
  const values = state && "email" in state ? state : null;

  return (
    <div className="flex flex-col justify-center px-8 py-12 sm:px-11">
      <h2 className="font-heading text-2xl font-bold">
        {signup ? "Create your workspace" : "Welcome back"}
      </h2>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {signup ? "Start planning growth in minutes." : "Log in to your growth workspace."}
      </p>

      {state && "sent" in state ? (
        <div className="rounded-xl border bg-primary/5 p-4 text-sm">
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-muted-foreground">
            We sent a confirmation link to {state.sent}. Click it to finish creating your account.
          </p>
        </div>
      ) : (
        <>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="mode" value={mode} />
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
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!signup && (
                  <Link
                    href="/login/forgot"
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                required
                minLength={8}
                placeholder="••••••••••"
              />
              {signup && (
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              )}
            </div>

            {values?.error && <p className="text-sm text-destructive">{values.error}</p>}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "One moment…" : signup ? "Create account" : "Log in"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full">
              <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.19 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z"
                />
              </svg>
              Continue with Google
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {signup ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setMode(signup ? "signin" : "signup")}
            >
              {signup ? "Log in" : "Create your workspace"}
            </button>
          </p>
        </>
      )}
    </div>
  );
}
