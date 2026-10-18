import { describe, expect, it } from "vitest";
import { GuideApplicationStatus } from "@/src/server/db/generated/enums";
import {
  experienceVerificationStatusDescription,
  guideApplicationStatusDescription,
  guideApplicationStatusLabel,
} from "./guide-application-status";

describe("guide application status presentation", () => {
  it.each([
    [GuideApplicationStatus.DRAFT, "Draft"],
    [GuideApplicationStatus.PENDING, "Pending"],
    [GuideApplicationStatus.SUBMITTED, "Submitted"],
    [GuideApplicationStatus.UNDER_REVIEW, "Under review"],
    [GuideApplicationStatus.CHANGES_REQUESTED, "Changes requested"],
    [GuideApplicationStatus.APPROVED, "Approved"],
    [GuideApplicationStatus.REJECTED, "Rejected"],
    [GuideApplicationStatus.SUSPENDED, "Suspended"],
  ])("labels status %s", (status, label) => {
    expect(guideApplicationStatusLabel(status)).toBe(label);
  });

  it("keeps guide approval distinct from experience approval", () => {
    expect(guideApplicationStatusDescription(GuideApplicationStatus.APPROVED)).toContain(
      "Each experience still requires separate approval",
    );
  });

  it("does not describe submitted experiences as public or bookable", () => {
    expect(
      experienceVerificationStatusDescription(GuideApplicationStatus.SUBMITTED),
    ).toContain("not bookable yet");
  });

  it("states the guide condition for approved experience visibility", () => {
    expect(
      experienceVerificationStatusDescription(GuideApplicationStatus.APPROVED),
    ).toContain("guide account remains approved and active");
  });
});
