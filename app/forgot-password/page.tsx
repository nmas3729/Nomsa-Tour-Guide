import type { Metadata } from "next";
import { AuthShell } from "@/src/features/auth/components/auth-ui";
import { ForgotPasswordForm } from "@/src/features/auth/components/auth-forms";

export const metadata: Metadata = {
  title: "Forgot password | Nomsa Tour Guides",
  description: "Request a secure password reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title="Let's get you back in."
      description="Enter your email and, if your account is eligible, we'll send a secure password reset link."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
