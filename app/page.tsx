import type { Metadata } from "next";
import { HomePage } from "@/src/components/marketing/home-page";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Discover South Africa with Local Guides",
  description: "Find thoughtful local experiences and meet the people who bring South Africa to life with Nomsa Tour Guides.",
  path: "/",
});

export default function Page() {
  return <PublicLayout><HomePage /></PublicLayout>;
}
