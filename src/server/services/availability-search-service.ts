import "server-only";

import { ExperienceStatus } from "@/src/server/db/generated/enums";
import { getPrismaClient } from "@/src/server/db/prisma";

const BOOKING_TIME_SLOTS = ["09:00 AM", "02:00 PM"] as const;

type AvailabilitySearchRow = {
  experienceId: string;
  timeSlot: string;
  remainingCapacity: number;
  experience: { slug: string };
};

export function filterAvailableExperienceSlugs(
  rows: AvailabilitySearchRow[],
  requiredGuests: number,
): string[] {
  const availabilityByExperience = new Map<
    string,
    { slug: string; capacityByTimeSlot: Map<string, number> }
  >();

  for (const row of rows) {
    const availability = availabilityByExperience.get(row.experienceId) ?? {
      slug: row.experience.slug,
      capacityByTimeSlot: new Map<string, number>(),
    };
    availability.capacityByTimeSlot.set(row.timeSlot, row.remainingCapacity);
    availabilityByExperience.set(row.experienceId, availability);
  }

  return [...availabilityByExperience.values()]
    .filter(({ capacityByTimeSlot }) =>
      BOOKING_TIME_SLOTS.some((timeSlot) => {
        const capacity = capacityByTimeSlot.get(timeSlot) ?? capacityByTimeSlot.get("ALL_DAY");
        return capacity !== undefined && capacity >= requiredGuests;
      }),
    )
    .map(({ slug }) => slug);
}

export async function findAvailableExperienceSlugs(date: string, requiredGuests: number) {
  const availability = await getPrismaClient().availability.findMany({
    where: {
      date: new Date(`${date}T00:00:00.000Z`),
      experience: {
        is: {
          status: ExperienceStatus.PUBLISHED,
          deletedAt: null,
          currency: "ZAR",
        },
      },
    },
    select: {
      experienceId: true,
      timeSlot: true,
      remainingCapacity: true,
      experience: { select: { slug: true } },
    },
  });

  return filterAvailableExperienceSlugs(availability, requiredGuests);
}
