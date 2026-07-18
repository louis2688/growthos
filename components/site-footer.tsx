import Link from "next/link";

/**
 * Global slim footer, fixed to the viewport bottom on EVERY page (marketing, auth, and the
 * signed-in app) and visible while scrolling. The body and the app sidebar carry matching
 * bottom padding so no content or control ever hides behind it.
 */
export function SiteFooter() {
  return (
    <footer className="glass fixed inset-x-0 bottom-0 z-40 border-t">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 px-4 py-2 text-[11px] text-muted-foreground">
        <span>© 2026 GrowthOS by LaunchLift</span>
        <span aria-hidden>·</span>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
      </p>
    </footer>
  );
}
