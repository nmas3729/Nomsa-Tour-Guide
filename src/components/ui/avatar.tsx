"use client";

import Image, { type ImageProps } from "next/image";
import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

export function Avatar({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      className={cn("relative isolate flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted", className)}
      {...props}
    />
  );
}

export function AvatarImage({
  className,
  alt = "",
  sizes = "64px",
  onError,
  ...props
}: Omit<ImageProps, "fill" | "sizes"> & { sizes?: string }) {
  const isLocalImage = typeof props.src === "string" && props.src.startsWith("/");
  return (
    <Image
      alt={alt}
      className={cn("avatar-image absolute inset-0 z-10 size-full object-cover", className)}
      fill
      onError={(event) => {
        event.currentTarget.hidden = true;
        onError?.(event);
      }}
      sizes={sizes}
      {...props}
      unoptimized={!isLocalImage}
    />
  );
}

export function AvatarFallback({
  className,
  ...props
}: ComponentProps<"span">) {
  return <span className={cn("grid size-full place-items-center bg-secondary text-sm font-semibold text-primary", className)} {...props} />;
}
