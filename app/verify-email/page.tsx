import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/src/features/auth/components/auth-ui";
import { VerifyEmailForm } from "@/src/features/auth/components/auth-forms";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Verify your email or request a new verification link.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

async function VerifyEmailContent({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <VerifyEmailForm token={token} />
    </>
  );
}

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <AuthShell
      eyebrow="ONE QUICK STEP"
      title="Confirm it's really you."
      description="Verify your email address to complete account setup. Guide accounts are activated after approval."
    >
      <Suspense fallback={<p className="auth-description">Preparing verification…</p>}>
        <VerifyEmailContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
