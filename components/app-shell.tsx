"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Rocket, Settings, ShieldCheck, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLockup, BrandMark } from "@/components/brand-mark";
import { signOut } from "@/app/login/actions";

// "Activity", not "Analytics": this shows what the AI did on your behalf. Analytics would
// promise campaign performance — signups, CTR — which needs your own analytics tool, since
// GrowthOS has no access to your traffic.
const navItems = [
  { label: "Campaigns", href: "/", icon: Rocket },
  { label: "Toolbox", href: "/toolbox", icon: Wrench },
  { label: "Activity", href: "/activity", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

function Nav({
  showLabels,
  onNavigate,
  user,
}: {
  showLabels: boolean;
  onNavigate?: () => void;
  user: { email: string; name: string; initial: string; isAdmin: boolean };
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/campaigns") || pathname === "/new"
      : pathname.startsWith(href);

  // Cosmetic gate only — the /admin page enforces the real check server-side.
  const items = user.isAdmin
    ? [...navItems, { label: "Admin", href: "/admin", icon: ShieldCheck }]
    : navItems;

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          title={label}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive(href)
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:bg-primary/6"
          } ${showLabels ? "" : "justify-center px-0"}`}
        >
          <Icon className="size-4 flex-none" aria-hidden />
          {showLabels && <span>{label}</span>}
        </Link>
      ))}
      <div className={`mt-auto border-t pt-3 ${showLabels ? "" : "flex flex-col items-center"}`}>
        <div
          title={user.email}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm ${
            showLabels ? "" : "justify-center px-0"
          }`}
        >
          <span className="grid size-8 flex-none place-items-center rounded-full bg-primary font-heading text-xs font-bold text-primary-foreground">
            {user.initial}
          </span>
          {showLabels && (
            <span className="min-w-0">
              <span className="block truncate font-medium">{user.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
            </span>
          )}
        </div>
        <form action={signOut} className="mt-0.5">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            onClick={onNavigate}
            aria-label="Log out"
            className={`text-muted-foreground ${showLabels ? "w-full justify-start" : "w-full justify-center"}`}
          >
            <LogOut className="size-4" aria-hidden />
            {showLabels && <span className="ml-1 text-xs">Log out</span>}
          </Button>
        </form>
      </div>
    </nav>
  );
}

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { email: string; name: string; initial: string; isAdmin: boolean } | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Login page has its own full-bleed layout — no shell.
  if (!user || pathname.startsWith("/login")) return <>{children}</>;

  return (
    <div className="flex min-h-dvh w-full max-md:flex-col">
      {/* Desktop sidebar — collapsible */}
      <aside
        // pb-12: clears the fixed SiteFooter so the collapse button stays clickable.
        className={`glass sticky top-0 flex h-dvh flex-col border-r p-3.5 pb-12 transition-[width] duration-200 max-md:hidden ${
          collapsed ? "w-[68px]" : "w-56"
        }`}
      >
        <div className={`flex items-center pb-5 ${collapsed ? "justify-center" : "px-1"}`}>
          <Link href="/" className="flex items-center">
            {collapsed ? <BrandMark /> : <BrandLockup />}
          </Link>
        </div>
        <Nav showLabels={!collapsed} user={user} />
        <div className="mt-3 flex flex-col gap-0.5">
          <ThemeToggle showLabel={!collapsed} />
          <Button
            variant="ghost"
            size="sm"
            className={`text-muted-foreground ${collapsed ? "w-full justify-center" : "w-full justify-start"}`}
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && <span className="ml-1 text-xs">Collapse</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="glass sticky top-0 z-40 border-b md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center">
            <BrandLockup />
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
            <Nav showLabels user={user} onNavigate={() => setMobileOpen(false)} />
            <div className="mt-1">
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
