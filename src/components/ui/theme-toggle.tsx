"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/src/components/ui/button";

import { cn } from "@/src/lib/utils";

const modes = ["light", "dark", "system"] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const activeMode = mounted && (theme === "light" || theme === "dark") ? theme : "system";
  const ActiveIcon = activeMode === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  const nextMode = modes[(modes.indexOf(activeMode) + 1) % modes.length];

  return (
    <Button
      aria-label={`Color theme: ${activeMode}. Switch to ${nextMode} theme.`}
      className={cn(
        "ui-icon-button border border-border/80 bg-card text-foreground shadow-sm transition-colors hover:border-accent/60 hover:bg-accent/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={() => setTheme(nextMode)}
      size="icon"
      title={`Color theme: ${activeMode}`}
      variant="ghost"
    >
      <ActiveIcon aria-hidden="true" size={18} />
    </Button>
  );
}
