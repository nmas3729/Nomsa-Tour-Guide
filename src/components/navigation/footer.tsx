import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { Container } from "@/src/components/layout/container";
import { BrandMark } from "@/src/components/navigation/brand-mark";
import { provinces } from "@/src/data/public-site";

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-card text-foreground">
      <Container className="grid gap-x-10 gap-y-10 py-12 sm:grid-cols-2 sm:gap-y-12 sm:py-16 xl:grid-cols-6 xl:py-20">
        {/* Brand Overview */}
        <div className="max-w-xs sm:col-span-2 xl:col-span-2">
          <Link
            aria-label="Nomsa Tour Guides home"
            className="group inline-flex items-center gap-3 no-underline"
            href="/"
          >
            <BrandMark className="size-14 rounded-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">
              Nomsa Tour Guides
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Discover South Africa through the landscapes, flavours, heritage, and local perspectives of its nine provinces.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary">
            <MapPin aria-hidden="true" size={15} />
            <span>Cape Town · Kruger · Johannesburg · Winelands</span>
          </div>
        </div>

        {/* Company */}
        <div className="grid content-start gap-3.5 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Company</h2>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/about">
            Our Story & Values
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/contact">
            Contact Concierge
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/#why-us">
            Why Choose Nomsa
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/#how-it-works">
            How It Works
          </Link>
        </div>

        {/* Explore */}
        <div className="grid content-start gap-3.5 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Explore</h2>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/experiences">
            All Experiences
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/destinations">
            Destinations
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/guides">
            Meet Local Guides
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/become-a-guide">
            Become a Host
          </Link>
        </div>

        {/* Top Destinations */}
        <div className="grid content-start gap-3.5 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Destinations</h2>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/destinations">
            Cape Town & Peninsula
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/destinations">
            Kruger National Park
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/destinations">
            The Cape Winelands
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/destinations">
            Drakensberg Escarpment
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/destinations">
            Johannesburg & Soweto
          </Link>
        </div>

        {/* Guides & Support */}
        <div className="grid content-start gap-6 text-sm sm:col-span-2 xl:col-span-1">
          <div className="grid content-start gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Host Community</h2>
            <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/become-a-guide">
              Guide Standards
            </Link>
            <Link className="font-semibold text-primary transition-colors hover:underline" href="/register?role=GUIDE">
              Apply to Host Tours →
            </Link>
          </div>

          <div className="grid content-start gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Connect</h2>
            <div className="flex flex-col gap-2.5">
              <a
                className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                href="mailto:hello@nomsatourguides.co.za"
              >
                <Mail aria-hidden="true" size={14} />
                hello@nomsatourguides.co.za
              </a>
              <div className="mt-2 flex items-center gap-3 text-muted-foreground">
                <a
                  aria-label="Instagram"
                  className="rounded-full p-1.5 transition-colors hover:bg-muted hover:text-foreground"
                  href="https://instagram.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  <svg aria-hidden="true" className="size-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  aria-label="Facebook"
                  className="rounded-full p-1.5 transition-colors hover:bg-muted hover:text-foreground"
                  href="https://facebook.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  <svg aria-hidden="true" className="size-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  aria-label="X (Twitter)"
                  className="rounded-full p-1.5 transition-colors hover:bg-muted hover:text-foreground"
                  href="https://x.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  <svg aria-hidden="true" className="size-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-border/60 pt-7 sm:col-span-2 xl:col-span-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Explore by province</h2>
            <nav aria-label="Explore experiences by province" className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-9">
              {provinces.map((province) => (
                <Link
                  className="min-h-11 rounded-lg py-2 text-xs leading-relaxed text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/experiences?province=${encodeURIComponent(province)}`}
                  key={province}
                >
                  {province}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="grid gap-5 border-t border-border/60 pt-7 text-xs text-muted-foreground sm:col-span-2 lg:col-span-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Nomsa Tour Guides (Pty) Ltd. Handcrafted with pride in South Africa.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link className="transition-colors hover:text-foreground" href="/privacy">
                Privacy Notice
              </Link>
              <Link className="transition-colors hover:text-foreground" href="/terms">
                Website Terms
              </Link>
              <Link className="transition-colors hover:text-foreground" href="/contact">
                Contact
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium text-foreground/80">
              Designed &amp; Hosted by{" "}
              <a
                className="font-semibold text-primary underline-offset-4 hover:underline"
                href="https://sihleb.co.za"
                rel="noreferrer"
                target="_blank"
              >
                SihleB
              </a>
            </p>
            <span className="text-muted-foreground">South Africa, closer.</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
