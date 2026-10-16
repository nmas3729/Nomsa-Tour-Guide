import type { Metadata } from "next";
import { AboutPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Our Story",
  description: "Learn why Nomsa Tour Guides connects travellers with the people and perspectives that make South Africa feel closer.",
  path: "/about",
});

export default function Page() {
  return <PublicLayout><AboutPage /></PublicLayout>;
}
