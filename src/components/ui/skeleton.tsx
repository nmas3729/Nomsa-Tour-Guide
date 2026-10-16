import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-muted", className)} {...props} />;
}
