import type { Metadata } from "next";
import { NotFoundPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Page Not Found",
  description: "This page wandered off. Find your way back to Nomsa Tour Guides.",
  path: "/404",
});

export default function Page() {
  return <PublicLayout><NotFoundPage /></PublicLayout>;
}
