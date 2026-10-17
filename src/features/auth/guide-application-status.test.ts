import { describe, expect, it } from "vitest";
import { GuideApplicationStatus } from "@/src/server/db/generated/enums";
import {
  guideApplicationStatusDescription,
  guideApplicationStatusLabel,
} from "./guide-application-status";

describe("guide application status presentation", () => {
  it.each([
    [GuideApplicationStatus.PENDING, "Pending"],
    [GuideApplicationStatus.UNDER_REVIEW, "Under review"],
    [GuideApplicationStatus.APPROVED, "Approved"],
    [GuideApplicationStatus.REJECTED, "Rejected"],
    [GuideApplicationStatus.SUSPENDED, "Suspended"],
  ])("labels status %s", (status, label) => {
    expect(guideApplicationStatusLabel(status)).toBe(label);
  });

  it("keeps approval distinct from publication", () => {
    expect(guideApplicationStatusDescription(GuideApplicationStatus.APPROVED)).toContain(
      "publication remains a separate manual step",
    );
  });
});
