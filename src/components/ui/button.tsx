import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

export const buttonVariants = cva(
  "ui-button premium-button inline-flex items-center justify-center gap-2.5 rounded-full font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "ui-button-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-px active:translate-y-0",
        secondary: "ui-button-secondary bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "ui-button-outline border border-border bg-transparent hover:bg-muted hover:border-primary/20",
        ghost: "ui-button-ghost text-foreground hover:bg-muted/60",
        link: "ui-button-link text-primary underline-offset-4 hover:underline p-0 h-auto",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 hover:-translate-y-px active:translate-y-0",
      },
      size: {
        default: "h-12 px-6 text-[0.9375rem]",
        sm: "h-10 px-5 text-sm",
        lg: "h-14 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = Omit<ComponentProps<"button">, "color"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  asChild = false,
  className,
  size,
  type = "button",
  variant,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(buttonVariants({ className, size, variant }))}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}
