import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn("ui-select", className)} {...props} />;
}
