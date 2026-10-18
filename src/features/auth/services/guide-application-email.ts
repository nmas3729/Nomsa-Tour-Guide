import "server-only";

import { Resend } from "resend";
import { requireGuideApplicationEmailEnvironment } from "@/src/config/env";
import type { GuideApplicationStatus } from "@/src/server/db/generated/enums";

export type GuideApplicationReviewDetails = {
  name: string;
  email: string;
  phone: string;
  applicationId: string;
  serviceTitle: string;
  status: GuideApplicationStatus;
};

export async function sendGuideApplicationReviewEmail(application: GuideApplicationReviewDetails): Promise<void> {
  const {
    RESEND_API_KEY,
    GUIDE_APPLICATION_FROM_EMAIL,
    GUIDE_APPLICATION_TO_EMAIL,
  } = requireGuideApplicationEmailEnvironment();
  const resend = new Resend(RESEND_API_KEY);
  const fields = [
    `Name: ${application.name}`,
    `Email: ${application.email}`,
    `Phone: ${application.phone}`,
    `Proposed experience: ${application.serviceTitle}`,
    "",
    `Application reference: ${application.applicationId}`,
    `Application status: ${application.status}`,
    "Review the full profile, proposed service, and protected documents in the admin dashboard.",
  ];
  const { error } = await resend.emails.send({
    from: GUIDE_APPLICATION_FROM_EMAIL,
    to: GUIDE_APPLICATION_TO_EMAIL,
    replyTo: application.email,
    subject: `Guide application for review: ${application.name}`,
    text: fields.join("\n"),
  });

  if (error) {
    throw new Error(`Guide application review email failed: ${error.name}`);
  }
}
