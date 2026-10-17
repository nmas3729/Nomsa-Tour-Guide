import type { Metadata } from "next";
import { AboutPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Our Story",
  description: "How Nomsa Tour Guides connects travellers with independent local guides.",
  path: "/about",
});

export default function Page() {
  return <PublicLayout><AboutPage /></PublicLayout>;
}
