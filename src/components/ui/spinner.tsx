import { LoaderCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-label="Loading" className={cn("animate-spin", className)} role="status" size={18} />;
}
