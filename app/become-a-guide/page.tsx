import type { Metadata } from "next";
import { BecomeGuidePage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Become a Local Guide",
  description: "Share your local knowledge with travellers as a guide on Nomsa Tour Guides.",
  path: "/become-a-guide",
});

export default function Page() {
  return <PublicLayout><BecomeGuidePage /></PublicLayout>;
}
