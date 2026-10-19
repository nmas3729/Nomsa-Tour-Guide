import type { MetadataRoute } from "next";
import { experiences } from "@/src/data/public-site";
import { siteUrl } from "@/src/lib/seo";

const publicPaths = [
  "/",
  "/about",
  "/become-a-guide",
  "/contact",
  "/destinations",
  "/experiences",
  "/guides",
  "/privacy",
  "/terms",
  "/transport",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...publicPaths,
    ...experiences.map((experience) => `/experiences/${experience.slug}`),
  ];

  return paths.map((path) => ({
    url: new URL(path, siteUrl).toString(),
  }));
}
