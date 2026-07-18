import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";
import AppShell from "@/components/app-shell";
import { currentUser } from "@/lib/supabase/server";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  // The production domain (Dave's, DNS on Cloudflare). Without metadataBase, every relative
  // OG/twitter image URL resolves against localhost/preview URLs and share cards break.
  metadataBase: new URL("https://launchlift.app"),
  title: "GrowthOS",
  description:
    "Type a goal. Get a growth campaign — channels found by live web search, prioritized todos, and community-safe copy.",
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
      className={`${dmSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell user={shellUser}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
