"use client";

import { Button } from "@/components/ui/button";

// Shown when a server read throws (e.g. a Supabase blip) instead of rendering a
// misleading empty state. Better a visible "try again" than a false "no campaigns".
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn&apos;t load this page. This is usually temporary — please try again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
