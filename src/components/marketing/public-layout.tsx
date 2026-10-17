import type { ReactNode } from "react";
import { SiteLayout } from "@/src/components/layout/site-layout";
import { cn } from "@/src/lib/utils";

export function PublicLayout({ children }: { children: ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}

export function PublicPageIntro({
  eyebrow,
  title,
  description,
  className,
  titleClassName,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <header className={cn("mx-auto max-w-3xl text-center", className)}>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h1 className={cn("font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl", titleClassName)}>{title}</h1>
      {description ? (
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
      ) : null}
    </header>
  );
}
