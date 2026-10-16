import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

type GlassPanelProps = ComponentProps<"div"> & {
  depth?: "subtle" | "floating";
};

export function GlassPanel({
  className,
  depth = "subtle",
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn("glass-panel", `glass-panel--${depth}`, className)}
      {...props}
    />
  );
}
