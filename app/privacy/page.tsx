import type { Metadata } from "next";
import { LegalPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { privacySections } from "@/src/data/legal";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Privacy Notice",
  description: "Read how Nomsa Tour Guides handles personal information and protects privacy.",
  path: "/privacy",
});

export default function Page() {
  return (
    <PublicLayout>
      <LegalPage
        eyebrow="Your information"
        introduction="This notice explains how Nomsa Tour Guides may handle personal information when you visit the website, create an account, contact us, or apply to become a guide."
        lastUpdated="16 October 2026"
        sections={privacySections}
        title="Privacy notice"
      />
    </PublicLayout>
  );
}
