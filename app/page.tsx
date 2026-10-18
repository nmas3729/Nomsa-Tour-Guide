import { Suspense } from "react";
import type { Metadata } from "next";
import { HomePage, HomePageFallback } from "@/src/components/marketing/home-page";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Locally Led Experiences in South Africa",
  description: "Browse walks, safaris, tastings, and cultural experiences led by local guides.",
  path: "/",
});

export default function Page() {
  return (
    <PublicLayout>
      <Suspense fallback={<HomePageFallback />}>
        <HomePage />
      </Suspense>
    </PublicLayout>
  );
}
