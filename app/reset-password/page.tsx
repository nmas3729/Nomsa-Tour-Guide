import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AuthShell } from "@/src/features/auth/components/auth-ui";
import { ResetPasswordForm } from "@/src/features/auth/components/auth-forms";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your account.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await connection();
  const { token } = await searchParams;

  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title="Choose a new password."
      description="Use a strong password you have not used for this account before."
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="auth-switch">
          This reset link is missing or invalid. <Link href="/forgot-password">Request another link</Link>.
        </p>
      )}
    </AuthShell>
  );
}
