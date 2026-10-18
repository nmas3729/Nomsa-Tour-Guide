"use client";

import { useSyncExternalStore } from "react";
import { Mail } from "lucide-react";

const contactEmail = ["hello", "nomsatourguides.co.za"].join("@");
const subscribeToHydration = () => () => {};

export function ContactEmailLink() {
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  return (
    <a
      aria-label={isHydrated ? `Email our team ${contactEmail}` : "Email our team"}
      className="flex items-start gap-4 text-foreground no-underline"
      href={isHydrated ? `mailto:${contactEmail}` : undefined}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Mail aria-hidden="true" size={19} />
      </span>
      <span>
        <span className="block text-sm font-semibold">Email our team</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {isHydrated ? contactEmail : ""}
        </span>
      </span>
    </a>
  );
}
