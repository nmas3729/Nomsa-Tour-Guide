"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ThemeToggle } from "@/src/components/ui/theme-toggle";
import { BrandMark } from "@/src/components/navigation/brand-mark";
import { cn } from "@/src/lib/utils";

const navLinks = [
  { href: "/experiences", label: "Experiences" },
  { href: "/destinations", label: "Destinations" },
  { href: "/guides", label: "Guides" },
  { href: "/become-a-guide", label: "Become a Guide" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function Brand({ isTransparent }: { isTransparent: boolean }) {
  return (
    <Link
      aria-label="Nomsa Tour Guides home"
      className="group inline-flex shrink-0 items-center gap-2 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-3"
      href="/"
    >
      <BrandMark className="size-9 rounded-full object-cover transition-transform duration-300 group-hover:scale-105 sm:size-12 lg:size-14" />
      <span
        className={cn(
          "whitespace-nowrap font-display text-base font-bold tracking-tight transition-colors duration-300 sm:text-xl lg:text-2xl",
          isTransparent ? "text-white" : "text-foreground",
        )}
      >
        Nomsa Tour Guides
      </span>
    </Link>
  );
}

function MobileNavigation({
  isTransparent,
  pathname,
}: {
  isTransparent: boolean;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const dialogId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <>
      <Button
        aria-label="Open navigation menu"
        aria-controls={dialogId}
        aria-expanded={isOpen}
        className={cn(
          "xl:hidden",
          isTransparent && "border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white",
        )}
        onClick={() => setIsOpen(true)}
        size="icon"
        type="button"
        variant="outline"
      >
        <Menu aria-hidden="true" size={20} />
      </Button>
      <dialog
        aria-labelledby={titleId}
        className="mobile-navigation-dialog fixed inset-x-0 bottom-0 z-50 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-border bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-foreground shadow-xl focus:outline-none xl:hidden"
        id={dialogId}
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeMenu();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeMenu();
          }
        }}
        ref={dialogRef}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="flex items-center gap-3 font-display text-2xl font-bold" id={titleId}>
            <BrandMark className="size-12 rounded-full object-cover" />
            Nomsa Tour Guides
          </h2>
          <button
            aria-label="Close navigation menu"
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={closeMenu}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>

        <nav aria-label="Mobile navigation" className="mt-6 grid gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted",
                )}
                href={link.href}
                key={link.href}
                onClick={closeMenu}
              >
                <span>{link.label}</span>
                <ArrowRight aria-hidden="true" className="opacity-40" size={16} />
              </Link>
            );
          })}

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <Button asChild size="lg" variant="outline">
              <Link href="/login" onClick={closeMenu}>Login</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/register" onClick={closeMenu}>Register</Link>
            </Button>
          </div>
        </nav>
      </dialog>
    </>
  );
}

export function TopNavigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isTransparent = isHome && !isScrolled;

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 30);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-500",
        isTransparent && "home-navigation-transparent",
        isScrolled && "site-navigation-scrolled",
        isTransparent
          ? "border-b border-white/10 bg-gradient-to-b from-black/60 via-black/25 to-transparent text-white"
          : "border-b border-border/70 bg-background/95 text-foreground shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-20 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-10">
        <Brand isTransparent={isTransparent} />

        {/* Desktop Navigation */}
        <nav aria-label="Main navigation" className="hidden items-center gap-8 xl:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                className={cn(
                  "relative text-[0.9375rem] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isTransparent
                    ? isActive
                      ? "text-white font-semibold"
                      : "text-white/80 hover:text-white"
                    : isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                )}
                href={link.href}
                key={link.href}
              >
                {link.label}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -bottom-1 left-0 h-0.5 w-full rounded-full",
                      isTransparent ? "bg-accent" : "bg-primary",
                    )}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className={cn(isTransparent && "text-white hover:bg-white/15 hover:text-white")} />

          <div className="hidden items-center gap-2 sm:flex">
            <Button
              asChild
              className={cn(
                isTransparent && "text-white hover:bg-white/15 hover:text-white",
              )}
              variant="ghost"
            >
              <Link href="/login">Login</Link>
            </Button>
            <Button
              asChild
              className={cn(
                isTransparent
                  ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <Link href="/register">Register</Link>
            </Button>
          </div>

          <MobileNavigation isTransparent={isTransparent} pathname={pathname} />
        </div>
      </div>
    </header>
  );
}
