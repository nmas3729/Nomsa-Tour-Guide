import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

export function Container({
  className,
  size = "default",
  ...props
}: ComponentProps<"div"> & { size?: "default" | "narrow" | "wide" | "full" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        {
          default: "max-w-7xl",
          narrow: "max-w-3xl",
          wide: "max-w-screen-2xl",
          full: "max-w-none",
        }[size],
        className,
      )}
      {...props}
    />
  );
}
