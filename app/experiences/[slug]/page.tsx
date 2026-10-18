import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ExperienceDetail } from "@/src/components/experiences/experience-detail";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { experiences } from "@/src/data/public-site";
import { publicPageMetadata } from "@/src/lib/seo";
import {
  getApprovedExperienceDetail,
  getApprovedExperiences,
} from "@/src/server/services/public-verification-service";

export function generateStaticParams() {
  return experiences.map((exp) => ({
    slug: exp.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connection();
  const approvedData = await getApprovedExperienceDetail(slug);
  if (!approvedData) notFound();
  const data = approvedData;

  return publicPageMetadata({
    title: data.title,
    description: data.tagline ?? `${data.category} experience in ${data.destination}, ${data.province}.`,
    path: `/experiences/${slug}`,
  });
}

export default async function ExperienceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  await connection();
  const approvedData = await getApprovedExperienceDetail(slug);
  if (!approvedData) notFound();
  const data = approvedData;
  const approvedExperiences = await getApprovedExperiences();
  const preservedSearch = new URLSearchParams();
  for (const key of ["destination", "province", "date", "guests", "language", "category", "maxPrice", "duration"]) {
    const value = query[key];
    if (typeof value === "string" && value) preservedSearch.set(key, value);
  }

  return (
    <PublicLayout>
      <ExperienceDetail
        approvedExperiences={approvedExperiences}
        bookingSearchQuery={preservedSearch.toString()}
        data={data}
      />
    </PublicLayout>
  );
}
