import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BookingFlow } from "@/src/components/booking/booking-flow";
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
    title: `Book: ${data.title}`,
    description: `Review booking details for ${data.title} in ${data.destination}, ${data.province}.`,
    path: `/experiences/${slug}/book`,
    robots: { index: false, follow: false },
  });
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getExperienceDetail(slug);

  if (!data) {
    notFound();
  }

  await connection();
  const minimumBookingDate = new Date().toISOString().slice(0, 10);

  return (
    <PublicLayout>
      <BookingFlow experience={data} minimumBookingDate={minimumBookingDate} />
    </PublicLayout>
  );
}
