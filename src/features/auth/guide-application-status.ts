import { GuideApplicationStatus } from "@/src/server/db/generated/enums";

export function guideApplicationStatusLabel(status: GuideApplicationStatus): string {
  const labels: Record<GuideApplicationStatus, string> = {
    DRAFT: "Draft",
    PENDING: "Pending",
    SUBMITTED: "Submitted",
    UNDER_REVIEW: "Under review",
    CHANGES_REQUESTED: "Changes requested",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    SUSPENDED: "Suspended",
  };

  return labels[status];
}

export function guideApplicationStatusDescription(status: GuideApplicationStatus): string {
  const descriptions: Record<GuideApplicationStatus, string> = {
    DRAFT: "Your onboarding progress is saved privately and has not been submitted for review.",
    PENDING: "Your application has been received and is waiting for manual review.",
    SUBMITTED: "Your completed onboarding has been submitted for manual review.",
    UNDER_REVIEW: "The Nomsa team is reviewing your application.",
    CHANGES_REQUESTED: "The Nomsa team has requested changes before your application can be reviewed again.",
    APPROVED: "Your guide application is approved. Each experience still requires separate approval before it can be booked.",
    REJECTED: "Your application was not approved. Your profile and experiences are not bookable.",
    SUSPENDED: "Your guide access is currently suspended.",
  };

  return descriptions[status];
}

export function experienceVerificationStatusDescription(status: GuideApplicationStatus): string {
  const descriptions: Record<GuideApplicationStatus, string> = {
    DRAFT: "This proposed experience is a draft and is not visible or bookable.",
    PENDING: "This experience is waiting for manual review.",
    SUBMITTED: "This experience was submitted for separate review and is not bookable yet.",
    UNDER_REVIEW: "The Nomsa team is reviewing this experience.",
    CHANGES_REQUESTED: "The Nomsa team requested changes before this experience can be reviewed again.",
    APPROVED: "This experience is approved and published while the guide account remains approved and active.",
    REJECTED: "This experience was not approved and is not bookable.",
    SUSPENDED: "This experience is suspended and cannot receive bookings.",
  };
  return descriptions[status];
}
