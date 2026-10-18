import type { Metadata } from "next";
import { connection } from "next/server";
import { AuthShell } from "@/src/features/auth/components/auth-ui";
import { VerifyEmailForm } from "@/src/features/auth/components/auth-forms";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Verify your email or request a new verification link.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await connection();
  const { token } = await searchParams;

  return (
    <AuthShell
      eyebrow="ONE QUICK STEP"
      title="Confirm it's really you."
      description="Verify your email address to complete account setup. Guide accounts are activated after approval."
    >
      <VerifyEmailForm token={token} />
    </AuthShell>
  );
}
