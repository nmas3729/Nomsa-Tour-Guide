import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <li>
          <Link aria-label="Home" className="inline-flex items-center hover:text-foreground" href="/">
            <Home aria-hidden="true" size={14} />
          </Link>
        </li>
        {items.map((item, index) => (
          <li className="inline-flex items-center gap-2" key={`${item.label}-${index}`}>
            <ChevronRight aria-hidden="true" size={13} />
            {item.href && index < items.length - 1 ? (
              <Link className="hover:text-foreground" href={item.href}>{item.label}</Link>
            ) : (
              <span aria-current="page" className="font-medium text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
