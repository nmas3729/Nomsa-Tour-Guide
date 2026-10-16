import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("ui-textarea", className)} {...props} />;
}
