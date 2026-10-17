import "server-only";

import { Resend } from "resend";
import { requireContactEmailEnvironment } from "@/src/config/env";
import type { ContactMessage } from "@/src/schemas/contact";

export async function sendContactMessage(message: ContactMessage): Promise<void> {
  const { RESEND_API_KEY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL } =
    requireContactEmailEnvironment();
  const resend = new Resend(RESEND_API_KEY);
  const timestamp = new Date().toISOString();
  const text = [
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    `Inquiry: ${message.subject}`,
    `Received: ${timestamp}`,
    "",
    message.message,
  ].join("\n");

  const { error } = await resend.emails.send({
    from: CONTACT_FROM_EMAIL,
    to: CONTACT_TO_EMAIL,
    replyTo: message.email,
    subject: `Contact form: ${message.subject}`,
    text,
  });

  if (error) {
    throw new Error(`Resend contact email failed: ${error.name}`);
  }
}
