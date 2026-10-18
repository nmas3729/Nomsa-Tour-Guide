import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ExperiencesListing } from "@/src/components/experiences/experiences-listing";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";
import { findAvailableExperienceSlugs } from "@/src/server/services/availability-search-service";
import { getApprovedExperiences } from "@/src/server/services/public-verification-service";

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
  const approvedExperiences = await getApprovedExperiences();
  const query = await searchParams;
  const searchKey = JSON.stringify(query);
  const date = typeof query.date === "string" ? query.date : "";
  const guestValue = typeof query.guests === "string" ? query.guests : "2";
  const minimumDate = new Date().toISOString().slice(0, 10);
  const repeatedParameter = [
    "date",
    "guests",
    "destination",
    "province",
    "language",
    "category",
    "maxPrice",
    "duration",
  ].some((key) => Array.isArray(query[key]));
  let availableExperienceSlugs: string[] | undefined;
  let availabilitySearchError: string | undefined;
  const guestCount = Number(guestValue);
  const guestCountIsValid = Number.isInteger(guestCount) && guestCount >= 1 && guestCount <= 10;
  const groupSizeFilter =
    typeof query.guests === "string" &&
    guestCountIsValid
      ? guestCount
      : null;

  if (repeatedParameter) {
    availabilitySearchError = "Choose one value for each search filter.";
  } else if (
    (query.guests !== undefined && !guestCountIsValid) ||
    (date && !guestCountIsValid)
  ) {
    availabilitySearchError = "Choose a group size between 1 and 10.";
  } else if (date) {
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    const isValidDate =
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === date;
    if (!isValidDate || date < minimumDate) {
      availabilitySearchError = "Choose a valid travel date on or after today.";
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
  const requestedCategory = typeof query.category === "string" ? query.category : "";
  const requestedLanguage = typeof query.language === "string" ? query.language : "";
  const requestedProvince = typeof query.province === "string" ? query.province : "";
  const requestedMaxPrice = typeof query.maxPrice === "string" ? query.maxPrice : "";
  const requestedDuration = typeof query.duration === "string" ? query.duration : "";
  if (!availabilitySearchError && requestedCategory && requestedCategory !== "All" &&
      !approvedExperiences.some((experience) => experience.category === requestedCategory)) {
    availabilitySearchError = "Choose a listed experience category.";
  }
  if (!availabilitySearchError && requestedLanguage &&
      !approvedExperiences.some((experience) => experience.languages.includes(requestedLanguage))) {
    availabilitySearchError = "Choose a listed guide language.";
  }
  if (!availabilitySearchError && requestedProvince &&
      !approvedExperiences.some((experience) => experience.provinces.includes(requestedProvince))) {
    availabilitySearchError = "Choose a listed province.";
  }
  if (!availabilitySearchError && requestedMaxPrice &&
      (!/^\d+(?:\.\d{1,2})?$/.test(requestedMaxPrice) || Number(requestedMaxPrice) <= 0)) {
    availabilitySearchError = "Choose a valid maximum price.";
  }
  if (!availabilitySearchError && requestedDuration &&
      !["any", "short", "half", "full"].includes(requestedDuration)) {
    availabilitySearchError = "Choose a valid duration filter.";
  }

  return (
    <PublicLayout>
      <Suspense fallback={<div aria-label="Loading experiences" className="min-h-[70vh] bg-background" role="status" />}>
        <ExperiencesListing
          approvedExperiences={approvedExperiences}
          availabilityDate={date}
          availabilityGuestCount={Number(guestValue)}
          availabilitySearchError={availabilitySearchError}
          availableExperienceSlugs={availableExperienceSlugs}
          groupSizeFilter={groupSizeFilter}
          key={searchKey}
          minimumDate={minimumDate}
        />
      </Suspense>
    </PublicLayout>
  );
}
