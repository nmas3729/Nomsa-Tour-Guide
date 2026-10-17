"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Compass, Menu } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ThemeToggle } from "@/src/components/ui/theme-toggle";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/src/components/ui/drawer";
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
                  ? "bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <Link href="/register">Register</Link>
            </Button>
          </div>

          {/* Mobile Menu Slide-Over */}
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                aria-label="Open navigation menu"
                className={cn(
                  "xl:hidden",
                  isTransparent && "border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white",
                )}
                size="icon"
                variant="outline"
              >
                <Menu aria-hidden="true" size={20} />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="xl:hidden">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <DrawerTitle className="flex items-center gap-3 font-display text-2xl font-bold">
                  <BrandMark className="size-12 rounded-full object-cover" />
                  Nomsa Tour Guides
                </DrawerTitle>
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
                    >
                      <span>{link.label}</span>
                      <ArrowRight aria-hidden="true" className="opacity-40" size={16} />
                    </Link>
                  );
                })}

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild size="lg">
                    <Link href="/register">Register</Link>
                  </Button>
                </div>
              </nav>

              <div className="mt-8 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Compass aria-hidden="true" size={15} /> South Africa, closer
                </span>
                <span>© 2026 Nomsa</span>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
}
