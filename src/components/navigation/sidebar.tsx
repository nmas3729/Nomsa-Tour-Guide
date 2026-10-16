import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export type SidebarItem = { href: string; label: string; icon?: ReactNode };

export function Sidebar({
  items,
  currentPath,
  label = "Section navigation",
  className,
}: {
  items: SidebarItem[];
  currentPath: string;
  label?: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("w-full", className)}>
      <ul className="grid gap-1">
        {items.map((item) => {
          const active = item.href === currentPath;
          return (
            <li key={item.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", active && "bg-secondary text-primary")}
                href={item.href}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
