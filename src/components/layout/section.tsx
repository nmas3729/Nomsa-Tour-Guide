import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

export function Section({
  className,
  spacing = "default",
  ...props
}: ComponentProps<"section"> & { spacing?: "compact" | "default" | "spacious" }) {
  return (
    <section
      className={cn(
        "luxury-section",
        {
          compact: "py-10 sm:py-14",
          default: "py-16 sm:py-20 lg:py-28",
          spacious: "py-20 sm:py-28 lg:py-36",
        }[spacing],
        className,
      )}
      {...props}
    />
  );
}
