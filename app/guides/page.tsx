import type { Metadata } from "next";
import { GuidesPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Meet Local Tour Guides",
  description: "Meet South African local guides who share their knowledge, stories and favourite places.",
  path: "/guides",
});

export default function Page() {
  return <PublicLayout><GuidesPage /></PublicLayout>;
}
