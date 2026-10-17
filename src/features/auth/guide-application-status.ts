import { GuideApplicationStatus } from "@/src/server/db/generated/enums";

export function guideApplicationStatusLabel(status: GuideApplicationStatus): string {
  const labels: Record<GuideApplicationStatus, string> = {
    PENDING: "Pending",
    UNDER_REVIEW: "Under review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    SUSPENDED: "Suspended",
  };

  return labels[status];
}

export function guideApplicationStatusDescription(status: GuideApplicationStatus): string {
  const descriptions: Record<GuideApplicationStatus, string> = {
    PENDING: "Your application has been received and is waiting for manual review.",
    UNDER_REVIEW: "The Nomsa team is reviewing your application.",
    APPROVED: "Your application is approved. Profile publication remains a separate manual step.",
    REJECTED: "Your application was not approved.",
    SUSPENDED: "Your guide access is currently suspended.",
  };

  return descriptions[status];
}
