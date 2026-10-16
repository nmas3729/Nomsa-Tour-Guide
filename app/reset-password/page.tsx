import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/src/features/auth/components/auth-ui";
import { ResetPasswordForm } from "@/src/features/auth/components/auth-forms";

export const metadata: Metadata = {
  title: "Reset password | Nomsa Tour Guides",
  description: "Set a new password for your account.",
  referrer: "no-referrer",
};

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="auth-switch">
          This reset link is missing or invalid. <Link href="/forgot-password">Request another link</Link>.
        </p>
      )}
    </>
  );
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title="Choose a new password."
      description="Use a strong password you have not used for this account before."
    >
      <Suspense fallback={<p className="auth-description">Preparing password reset…</p>}>
        <ResetPasswordContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
