import type { Metadata } from "next";
import { Suspense } from "react";
import { ExperiencesListing } from "@/src/components/experiences/experiences-listing";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Browse Guided Experiences in South Africa",
  description: "Explore small-group experiences, safaris, vineyard tastings and cultural walks with South African local guides.",
  path: "/experiences",
});

export default function Page() {
  return (
    <PublicLayout>
      <Suspense fallback={<div aria-label="Loading experiences" className="min-h-[70vh] bg-background" role="status" />}>
        <ExperiencesListing />
      </Suspense>
    </PublicLayout>
  );
}
