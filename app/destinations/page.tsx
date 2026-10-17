import type { Metadata } from "next";
import { DestinationsPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "South Africa Destinations",
  description: "Browse coastlines, mountains, wildlife, food, and heritage across nine provinces.",
  path: "/destinations",
});

export default function Page() {
  return <PublicLayout><DestinationsPage /></PublicLayout>;
}
