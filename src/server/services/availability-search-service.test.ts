import { describe, expect, it } from "vitest";
import { filterAvailableExperienceSlugs } from "./availability-search-service";

describe("filterAvailableExperienceSlugs", () => {
  it("includes an experience when either booking time slot has enough capacity", () => {
    const available = filterAvailableExperienceSlugs(
      [
        {
          experienceId: "experience-1",
          timeSlot: "09:00 AM",
          remainingCapacity: 3,
          experience: { slug: "morning-tour" },
        },
        {
          experienceId: "experience-1",
          timeSlot: "02:00 PM",
          remainingCapacity: 6,
          experience: { slug: "morning-tour" },
        },
      ],
      4,
    );

    expect(available).toEqual(["morning-tour"]);
  });

  it("uses all-day capacity only when a booking time slot has no dedicated availability", () => {
    const available = filterAvailableExperienceSlugs(
      [
        {
          experienceId: "experience-1",
          timeSlot: "ALL_DAY",
          remainingCapacity: 5,
          experience: { slug: "all-day-tour" },
        },
        {
          experienceId: "experience-2",
          timeSlot: "09:00 AM",
          remainingCapacity: 2,
          experience: { slug: "limited-morning-tour" },
        },
        {
          experienceId: "experience-2",
          timeSlot: "02:00 PM",
          remainingCapacity: 2,
          experience: { slug: "limited-morning-tour" },
        },
        {
          experienceId: "experience-2",
          timeSlot: "ALL_DAY",
          remainingCapacity: 8,
          experience: { slug: "limited-morning-tour" },
        },
      ],
      4,
    );

    expect(available).toEqual(["all-day-tour"]);
  });

  it("excludes availability below the selected group size", () => {
    const available = filterAvailableExperienceSlugs(
      [
        {
          experienceId: "experience-1",
          timeSlot: "09:00 AM",
          remainingCapacity: 2,
          experience: { slug: "small-group-tour" },
        },
        {
          experienceId: "experience-2",
          timeSlot: "ALL_DAY",
          remainingCapacity: 5,
          experience: { slug: "larger-group-tour" },
        },
      ],
      6,
    );

    expect(available).toEqual([]);
  });
});
