import type { Metadata } from "next";

export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_APP_URL ?? "https://nomsatourguides.co.za",
);

const socialImage = "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1200&h=630&q=85";

export function publicPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: path,
      siteName: "Nomsa Tour Guides",
      locale: "en_ZA",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Cape Town's coastline and city beneath Table Mountain" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}
