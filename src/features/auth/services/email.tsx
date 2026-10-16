import "server-only";

import { Resend } from "resend";
import { requireEmailEnvironment } from "@/src/config/env";
import { createAuthEventLogger } from "@/src/features/auth/lib/tokens";
import {
  ResetPasswordEmail,
  VerifyEmailEmail,
  WelcomeEmail,
} from "@/src/features/auth/emails/auth-email";

function getEmailUrl(path: string, token: string): string {
  const { NEXT_PUBLIC_APP_URL } = requireEmailEnvironment();
  const url = new URL(path, NEXT_PUBLIC_APP_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM } = requireEmailEnvironment();
  const resend = new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, react });

  if (error) {
    createAuthEventLogger("email.failed", { subject, errorName: error.name });
    throw new Error("The email provider could not send the message.");
  }
}

export async function sendVerificationEmail(name: string, email: string, token: string) {
  await sendEmail({
    to: email,
    subject: "Verify your Nomsa Tour Guides email",
    react: VerifyEmailEmail({
      name,
      url: getEmailUrl("/verify-email", token),
    }),
  });
}

export async function sendPasswordResetEmail(name: string, email: string, token: string) {
  await sendEmail({
    to: email,
    subject: "Reset your Nomsa Tour Guides password",
    react: ResetPasswordEmail({
      name,
      url: getEmailUrl("/reset-password", token),
    }),
  });
}

export async function sendWelcomeEmail(name: string, email: string) {
  const { NEXT_PUBLIC_APP_URL } = requireEmailEnvironment();
  await sendEmail({
    to: email,
    subject: "Welcome to Nomsa Tour Guides",
    react: WelcomeEmail({ name, url: NEXT_PUBLIC_APP_URL }),
  });
}
