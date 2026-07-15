"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Menu, PanelLeftClose, PanelLeftOpen, Rocket, Settings, Wrench, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function Mark() {
  return (
    <span className="grid size-8 flex-none place-items-center rounded-lg bg-gradient-to-br from-primary to-brand-pink text-white">
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
  );
}

// ponytail: Toolbox/Analytics/Settings/Profile ship with v2 auth — visible roadmap, not dead links.
const soonItems = [
  { label: "Toolbox", icon: Wrench },
  { label: "Analytics", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

function Nav({
  showLabels,
  onNavigate,
}: {
  showLabels: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const campaignsActive =
    pathname === "/" || pathname.startsWith("/campaigns") || pathname === "/new";

  return (
    <nav className="flex flex-1 flex-col gap-1">
      <Link
        href="/"
        onClick={onNavigate}
        title="Campaigns"
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          campaignsActive
            ? "bg-primary/12 text-primary"
            : "text-muted-foreground hover:bg-primary/6"
        } ${showLabels ? "" : "justify-center px-0"}`}
      >
        <Rocket className="size-4 flex-none" aria-hidden />
        {showLabels && <span>Campaigns</span>}
      </Link>
      {soonItems.map(({ label, icon: Icon }) => (
        <span
          key={label}
          title={`${label} — coming in v2`}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/60 ${
            showLabels ? "" : "justify-center px-0"
          }`}
        >
          <Icon className="size-4 flex-none" aria-hidden />
          {showLabels && (
            <>
              <span>{label}</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                soon
              </Badge>
            </>
          )}
        </span>
      ))}
      <span
        title="Profile — coming with v2 auth"
        className={`mt-auto flex items-center gap-2.5 rounded-xl border-t px-3 pt-3.5 pb-1 text-sm font-medium text-muted-foreground/80 ${
          showLabels ? "" : "justify-center px-0"
        }`}
      >
        <span className="grid size-8 flex-none place-items-center rounded-full bg-gradient-to-br from-primary to-brand-pink font-heading text-xs font-bold text-white">
          L
        </span>
        {showLabels && (
          <>
            <span className="truncate">Louis M.</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              soon
            </Badge>
          </>
        )}
      </span>
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full max-md:flex-col">
      {/* Desktop sidebar — collapsible */}
      <aside
        className={`glass sticky top-0 flex h-dvh flex-col border-r p-3.5 transition-[width] duration-200 max-md:hidden ${
          collapsed ? "w-[68px]" : "w-56"
        }`}
      >
        <div className={`flex items-center pb-5 ${collapsed ? "justify-center" : "gap-2.5 px-1"}`}>
          <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold">
            <Mark />
            {!collapsed && <span>GrowthOS</span>}
          </Link>
        </div>
        <Nav showLabels={!collapsed} />
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-center text-muted-foreground"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && <span className="ml-1 text-xs">Collapse</span>}
        </Button>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="glass sticky top-0 z-40 border-b md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 font-heading text-lg font-bold"
          >
            <Mark />
            GrowthOS
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
        {mobileOpen && (
          <div className="border-t px-3 pt-2 pb-3">
            <Nav showLabels onNavigate={() => setMobileOpen(false)} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
