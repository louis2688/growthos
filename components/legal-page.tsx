import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

/**
 * Shared shell for the public legal pages (/privacy, /terms). Content sources live in
 * docs/plans/*.md (Dave's drafts) — reconciled against actual data practices before publishing;
 * if the drafts change, re-reconcile rather than pasting them in verbatim.
 */
export function LegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-10 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold">
          <BrandMark />
          GrowthOS
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>

      <h1 className="font-heading text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Effective {effectiveDate} · GrowthOS by LaunchLift (operating name; a legal entity will be
        designated as the service formalizes) · Contact:{" "}
        <a href="mailto:admin@launchlift.app" className="text-primary hover:underline">
          admin@launchlift.app
        </a>
      </p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-medium [&_p]:mt-2 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_strong]:text-foreground">
        {children}
      </div>

      <p className="mt-12 border-t pt-6 text-sm text-muted-foreground">
        See also:{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        ·{" "}
        <Link href="/pricing" className="text-primary hover:underline">
          Pricing
        </Link>
      </p>
    </main>
  );
}
