import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Container } from "@/src/components/layout/container";
import { PublicLayout, PublicPageIntro } from "@/src/components/marketing/public-layout";
import { Section } from "@/src/components/layout/section";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Transport Coming Soon",
  description: "Dedicated transport services are planned for a future release from Nomsa Tour Guides.",
  path: "/transport",
});

export default function Page() {
  return (
    <PublicLayout>
      <Section>
        <Container>
          <PublicPageIntro
            eyebrow="Coming soon"
            title="Transport, with local knowledge."
          />
          <div className="mt-8 max-w-2xl rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
            <p className="text-sm leading-7 text-muted-foreground">
              We&apos;re planning dedicated transport options for a future release. For now, transport is
              not included unless an experience explicitly lists it in its details.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/experiences">Explore experiences</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </PublicLayout>
  );
}
