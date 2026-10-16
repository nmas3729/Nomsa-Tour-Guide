import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExperienceDetail } from "@/src/components/experiences/experience-detail";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { getExperienceDetail } from "@/src/data/experience-details";
import { experiences } from "@/src/data/public-site";
import { publicPageMetadata } from "@/src/lib/seo";

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
  const data = getExperienceDetail(slug);

  if (!data) {
    notFound();
  }

  return publicPageMetadata({
    title: `${data.title} | Nomsa Tour Guides`,
    description: data.tagline ?? `${data.category} experience in ${data.destination}, ${data.province}.`,
    path: `/experiences/${slug}`,
  });
}

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getExperienceDetail(slug);

  if (!data) {
    notFound();
  }

  return (
    <PublicLayout>
      <ExperienceDetail data={data} />
    </PublicLayout>
  );
}
