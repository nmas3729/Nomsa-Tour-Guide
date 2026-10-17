import Link from "next/link";
import { Container } from "@/src/components/layout/container";
import { BrandMark } from "@/src/components/navigation/brand-mark";

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-card text-foreground">
      <Container className="flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <Link
            aria-label="Nomsa Tour Guides home"
            className="group inline-flex items-center gap-3 no-underline"
            href="/"
          >
            <BrandMark className="size-11 rounded-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Nomsa Tour Guides
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">© 2026 Nomsa Tour Guides (Pty) Ltd.</p>
        </div>

        <nav aria-label="Legal and support" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/contact">
            Contact
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/privacy">
            Privacy
          </Link>
          <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/terms">
            Terms
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground">
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
      </Container>
    </footer>
  );
}
