"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ showLabel = true }: { showLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  // resolvedTheme is undefined until mount; label stays generic until then so
  // server and client markup match. Icons/text switch via CSS, no flicker.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`text-muted-foreground ${showLabel ? "w-full justify-start" : "w-full justify-center"}`}
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={!mounted ? "Toggle dark mode" : dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Both icons render; CSS picks one so the button is stable before hydration */}
      <Sun className="size-4 dark:hidden" aria-hidden />
      <Moon className="hidden size-4 dark:block" aria-hidden />
      {showLabel && (
        <span className="ml-1 text-xs">
          <span className="dark:hidden">Dark mode</span>
          <span className="hidden dark:inline">Light mode</span>
        </span>
      )}
    </Button>
  );
}
