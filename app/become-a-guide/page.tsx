import type { Metadata } from "next";
import { BecomeGuidePage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Become a Local Guide",
  description: "Share what you love about South Africa and help travellers discover it from your perspective.",
  path: "/become-a-guide",
});

export default function Page() {
  return <PublicLayout><BecomeGuidePage /></PublicLayout>;
}
