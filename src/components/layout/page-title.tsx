import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

export function PageTitle({ className, ...props }: ComponentProps<"h1">) {
  return <h1 className={cn("font-display text-3xl font-medium tracking-tight sm:text-4xl", className)} {...props} />;
}
