import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("ui-input", className)} {...props} />;
}
