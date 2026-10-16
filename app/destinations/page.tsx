import type { Metadata } from "next";
import { DestinationsPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Explore Destinations in South Africa",
  description: "Explore South African coastlines, mountains, wildlife, food and heritage across all nine provinces.",
  path: "/destinations",
});

export default function Page() {
  return <PublicLayout><DestinationsPage /></PublicLayout>;
}
