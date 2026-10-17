import type { Metadata } from "next";
import { GuidesPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Local Tour Guides",
  description: "Browse guide profiles, specialties, languages, and listed experiences.",
  path: "/guides",
});

export default function Page() {
  return <PublicLayout><GuidesPage /></PublicLayout>;
}
