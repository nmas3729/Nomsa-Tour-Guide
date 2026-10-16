"use client";

import { LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "./button";

export function LoadingButton({
  loading,
  children,
  ...props
}: ComponentProps<typeof Button> & { loading: boolean; children: ReactNode }) {
  return (
    <Button disabled={loading || props.disabled} {...props}>
      {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : null}
      {loading ? "Please wait…" : children}
    </Button>
  );
}
