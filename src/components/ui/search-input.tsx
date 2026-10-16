import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";
import { Input } from "./input";

export function SearchInput({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
      <Input className="pl-10" type="search" {...props} />
    </div>
  );
}
