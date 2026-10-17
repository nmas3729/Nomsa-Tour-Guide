import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ExperiencesListing } from "@/src/components/experiences/experiences-listing";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";
import { findAvailableExperienceSlugs } from "@/src/server/services/availability-search-service";

export const metadata: Metadata = publicPageMetadata({
  title: "Guided Experiences in South Africa",
  description: "Find small-group walks, safaris, tastings, and cultural experiences with local guides.",
  path: "/experiences",
});

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const query = await searchParams;
  const date = typeof query.date === "string" ? query.date : "";
  const guestValue = typeof query.guests === "string" ? query.guests : "2";
  const minimumDate = new Date().toISOString().slice(0, 10);
  let availableExperienceSlugs: string[] | undefined;
  let availabilitySearchError: string | undefined;

  if (Array.isArray(query.date) || Array.isArray(query.guests)) {
    availabilitySearchError = "Choose one travel date and group size.";
  } else if (date) {
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    const isValidDate =
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === date;
    const guestCount = Number(guestValue);

    if (!isValidDate || date < minimumDate) {
      availabilitySearchError = "Choose a valid travel date on or after today.";
    } else if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 10) {
      availabilitySearchError = "Choose a group size between 1 and 10.";
    } else {
      try {
        availableExperienceSlugs = await findAvailableExperienceSlugs(date, guestCount);
      } catch (error) {
        console.error(JSON.stringify({
          event: "availability.search.failed",
          errorName: error instanceof Error ? error.name : "UnknownError",
        }));
        availableExperienceSlugs = [];
        availabilitySearchError = "Live availability is temporarily unavailable. No results are being shown as available.";
      }
    }
  }

  return (
    <PublicLayout>
      <Suspense fallback={<div aria-label="Loading experiences" className="min-h-[70vh] bg-background" role="status" />}>
        <ExperiencesListing
          availabilityDate={date}
          availabilityGuestCount={Number(guestValue)}
          availabilitySearchError={availabilitySearchError}
          availableExperienceSlugs={availableExperienceSlugs}
          minimumDate={minimumDate}
        />
      </Suspense>
    </PublicLayout>
  );
}
