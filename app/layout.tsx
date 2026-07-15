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
  title: "GrowthOS",
  description: "AI-generated growth campaigns",
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
