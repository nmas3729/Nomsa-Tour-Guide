import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ExperienceStatus, GuideApplicationStatus } from "@/src/server/db/generated/enums";
import { BookingFlow } from "@/src/components/booking/booking-flow";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { experiences } from "@/src/data/public-site";
import { publicPageMetadata } from "@/src/lib/seo";
import { getPrismaClient } from "@/src/server/db/prisma";
import { getApprovedExperienceDetail } from "@/src/server/services/public-verification-service";

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
  if (!approvedData) {
    return publicPageMetadata({
      title: "Booking unavailable",
      description: "This experience is not currently available for booking.",
      path: `/experiences/${slug}/book`,
      robots: { index: false, follow: false },
    });
  }
  const data = approvedData;

  return publicPageMetadata({
    title: `Book: ${data.title}`,
    description: `Review booking details for ${data.title} in ${data.destination}, ${data.province}.`,
    path: `/experiences/${slug}/book`,
    robots: { index: false, follow: false },
  });
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  await connection();
  const bookingExperience = await getPrismaClient().experience.findFirst({
    where: {
      slug,
      status: ExperienceStatus.PUBLISHED,
      verificationStatus: GuideApplicationStatus.APPROVED,
      deletedAt: null,
      guide: {
        is: {
          verificationStatus: GuideApplicationStatus.APPROVED,
          deletedAt: null,
          user: { is: { isActive: true, deletedAt: null } },
        },
      },
    },
    select: { price: true, currency: true, cancellationPolicy: true },
  });
  if (!bookingExperience || bookingExperience.currency !== "ZAR") {
    return (
      <PublicLayout>
        <main className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-5 py-16 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Booking is not available</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This experience cannot be booked until the guide and experience have both completed review.
          </p>
        </main>
      </PublicLayout>
    );
  }
  const approvedData = await getApprovedExperienceDetail(slug);
  if (!approvedData) notFound();
  const data = approvedData;
  const minimumBookingDate = new Date().toISOString().slice(0, 10);
  const requestedDate = typeof query.date === "string" ? query.date : "";
  const parsedRequestedDate = new Date(`${requestedDate}T00:00:00.000Z`);
  const initialDate =
    /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) &&
    !Number.isNaN(parsedRequestedDate.getTime()) &&
    parsedRequestedDate.toISOString().slice(0, 10) === requestedDate &&
    requestedDate >= minimumBookingDate
      ? requestedDate
      : "";
  const requestedGuestCount = Number(query.guests);
  const initialGuestCount =
    Number.isInteger(requestedGuestCount) && requestedGuestCount >= 1 && requestedGuestCount <= 10
      ? requestedGuestCount
      : 2;
  const preservedSearch = new URLSearchParams();
  for (const key of ["destination", "province", "date", "guests", "language", "category", "maxPrice", "duration"]) {
    const value = query[key];
    if (typeof value === "string" && value) preservedSearch.set(key, value);
  }

  return (
    <PublicLayout>
      <BookingFlow
        experience={{
          ...data,
          price: Number(bookingExperience.price),
          cancellationPolicy: bookingExperience.cancellationPolicy,
        }}
        initialDate={initialDate}
        initialGuestCount={initialGuestCount}
        minimumBookingDate={minimumBookingDate}
        searchQuery={preservedSearch.toString()}
      />
    </PublicLayout>
  );
}
