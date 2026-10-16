import type { Metadata } from "next";
import { LegalPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { termsSections } from "@/src/data/legal";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Website Terms",
  description: "Review the terms for using the Nomsa Tour Guides website and its public previews.",
  path: "/terms",
});

export default function Page() {
  return (
    <PublicLayout>
      <LegalPage
        eyebrow="The details"
        introduction="These terms describe the current use of the Nomsa Tour Guides website. Marketplace listings and contact forms shown here are previews unless stated otherwise."
        lastUpdated="16 October 2026"
        sections={termsSections}
        title="Website terms"
      />
    </PublicLayout>
  );
}
