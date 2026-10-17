"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function HomeReturnButton() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  const isBookingFlow = pathname.endsWith("/book");

  return (
    <Link
      aria-label="Back to home"
      className={cn(
        "fixed left-4 z-40 inline-flex size-11 items-center justify-center rounded-full border border-border bg-card/95 p-0 text-foreground shadow-lg backdrop-blur transition hover:border-accent/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:left-6",
        isBookingFlow
          ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]",
      )}
      href="/"
      title="Back to home"
    >
      <ArrowLeft aria-hidden="true" size={18} />
    </Link>
  );
}
