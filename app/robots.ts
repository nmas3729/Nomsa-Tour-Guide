import type { MetadataRoute } from "next";
import { siteUrl } from "@/src/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const disallowIndexing = process.env.NODE_ENV !== "production" || process.env.NO_INDEX === "true";
  return {
    rules: [
      {
        userAgent: "*",
        ...(disallowIndexing ? { disallow: "/" } : { allow: "/" }),
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
