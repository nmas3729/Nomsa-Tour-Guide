import type { ReactNode } from "react";
import { SiteLayout } from "@/src/components/layout/site-layout";

export function PublicLayout({ children }: { children: ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}

export function PublicPageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mx-auto max-w-3xl text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h1 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl">{title}</h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
    </header>
  );
}
