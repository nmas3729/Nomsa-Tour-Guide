import type { Metadata } from "next";
import { LegalPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { termsSections } from "@/src/data/legal";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Website Terms",
  description: "Review the terms for Nomsa Tour Guides accounts, guide applications, bookings, and payments.",
  path: "/terms",
});

export default function Page() {
  return (
    <PublicLayout>
      <LegalPage
        eyebrow="The details"
        introduction="These terms describe the use of Nomsa Tour Guides, including guide applications, booking requests, and hosted PayFast checkout."
        lastUpdated="17 October 2026"
        sections={termsSections}
        title="Website terms"
      />
    </PublicLayout>
  );
}
