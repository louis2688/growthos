import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import AppShell from "@/components/app-shell";
import { SiteFooter } from "@/components/site-footer";
import { currentUser } from "@/lib/supabase/server";
import "./globals.css";

// One face for display + body, per DESIGN-meta.md (Optimistic VF's licensed stand-in is its
// documented fallback, Montserrat). 300 = editorial subheads, 500 = display/headings,
// 400/700 = body/emphasis.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // The production domain (Dave's, DNS on Cloudflare). www, not apex: Vercel serves production
  // on www.launchlift.app with the apex 308-redirecting to it, so canonical/OG URLs must match
  // or every scraper eats a redirect. Without metadataBase, relative OG image URLs resolve
  // against localhost/preview URLs and share cards break.
  metadataBase: new URL("https://www.launchlift.app"),
  // Category + audience keyword in the title (Dave's SEO audit §3): brand-only "GrowthOS" gave
  // search and AI answer engines nothing to classify the entity by.
  title: "GrowthOS — AI Growth Marketing Platform for Indie Hackers",
  description:
    "Type a goal. Get a growth campaign — channels found by live web search, prioritized todos, and value-first copy.",
  openGraph: {
    title: "GrowthOS — type a goal, get a growth campaign",
    description:
      "AI turns “1,000 signups in 45 days” into researched channels, prioritized todos, and value-first copy that respects community rules.",
    url: "/",
    siteName: "GrowthOS",
    type: "website",
  },
  // No twitter:image set on purpose — X and other scrapers fall back to the og:image from
  // app/opengraph-image.tsx, which applies site-wide from this root segment.
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();
  const email = user?.email ?? "";
  const shellUser = user
    ? {
        email,
        name: (user.user_metadata?.full_name as string) ?? email.split("@")[0],
        initial: (email[0] ?? "?").toUpperCase(),
      }
    : null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${montserrat.variable} h-full antialiased`}
    >
      {/* pb-9 reserves room for the fixed SiteFooter so page content never hides behind it. */}
      <body className="min-h-full flex flex-col pb-9">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell user={shellUser}>{children}</AppShell>
          <SiteFooter />
          {/* Vercel Web Analytics: cookieless page analytics (disclosed in /privacy). Data only
              flows once Web Analytics is enabled on the Vercel project. */}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
