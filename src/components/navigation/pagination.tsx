import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export function Pagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  const pages = Array.from({ length: Math.max(0, totalPages) }, (_, index) => index + 1);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      <Button asChild aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-50" : ""} size="icon" variant="outline">
        <Link aria-label="Previous page" href={hrefForPage(Math.max(1, page - 1))}><ChevronLeft aria-hidden="true" size={17} /></Link>
      </Button>
      {pages.map((pageNumber) => (
        <Button asChild key={pageNumber} variant={pageNumber === page ? "primary" : "ghost"} size="icon">
          <Link aria-current={pageNumber === page ? "page" : undefined} href={hrefForPage(pageNumber)}>{pageNumber}</Link>
        </Button>
      ))}
      <Button asChild aria-disabled={page >= totalPages} className={page >= totalPages ? "pointer-events-none opacity-50" : ""} size="icon" variant="outline">
        <Link aria-label="Next page" href={hrefForPage(Math.min(totalPages, page + 1))}><ChevronRight aria-hidden="true" size={17} /></Link>
      </Button>
    </nav>
  );
}
