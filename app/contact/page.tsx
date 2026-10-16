import type { Metadata } from "next";
import { ContactPage } from "@/src/components/marketing/standard-pages";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Contact Us",
  description: "Get in touch with the Nomsa Tour Guides team in South Africa.",
  path: "/contact",
});

export default function Page() {
  return <PublicLayout><ContactPage /></PublicLayout>;
}
