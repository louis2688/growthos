"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Rocket, Settings, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-brand-pink text-white">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      </span>
      <span className="max-md:hidden">GrowthOS</span>
    </Link>
  );
}

// ponytail: Toolbox/Analytics/Settings ship in v2 — visible roadmap, not dead links.
const soon = [
  { label: "Toolbox", icon: Wrench },
  { label: "Analytics", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const campaignsActive = pathname === "/" || pathname.startsWith("/campaigns") || pathname === "/new";

  return (
    <div className="flex min-h-dvh w-full max-md:flex-col">
      <aside className="glass flex w-56 flex-col gap-1 border-r p-4 max-md:w-full max-md:flex-row max-md:items-center max-md:gap-3 max-md:border-r-0 max-md:border-b max-md:px-4 max-md:py-2.5">
        <div className="px-1 pb-5 max-md:pb-0">
          <Wordmark />
        </div>
        <Link
          href="/"
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            campaignsActive
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:bg-primary/6"
          }`}
        >
          <Rocket className="size-4" aria-hidden />
          <span className="max-md:hidden">Campaigns</span>
        </Link>
        {soon.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/60 max-md:hidden"
            title={`${label} — coming in v2`}
          >
            <Icon className="size-4" aria-hidden />
            <span>{label}</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              soon
            </Badge>
          </span>
        ))}
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
