"use client";

import { cn } from "@/src/lib/utils";

export function Progress({
  className,
  value,
  max = 100,
  ...props
}: React.ComponentProps<"div"> & { value: number; max?: number }) {
  const percentage = Math.min(100, Math.max(0, value ?? 0));

  return (
    <div
      aria-label={props["aria-label"] ?? "Progress"}
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={Math.round(percentage)}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
