import "server-only";

import { Resend } from "resend";
import { requireGuideApplicationEmailEnvironment } from "@/src/config/env";
import type { GuideRegistrationInput } from "@/src/features/auth/schemas";

export async function sendGuideApplicationReviewEmail(
  application: GuideRegistrationInput,
): Promise<void> {
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
    `Years of guiding experience: ${application.yearsExperience}`,
    `Business name: ${application.businessName || "Not provided"}`,
    `Business registration: ${application.businessRegistration || "Not provided"}`,
    `Specialities: ${application.specialties || "Not provided"}`,
    `Languages: ${application.languages || "Not provided"}`,
    `Operating areas: ${application.operatingAreas || "Not provided"}`,
    "",
    "Biography:",
    application.biography,
    "",
    "Application status: PENDING",
    "Review and any approval or publication decision must be made manually.",
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
