import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      {icon ? <div className="grid size-12 place-items-center rounded-full bg-secondary text-primary">{icon}</div> : null}
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action}
    </section>
  );
}
