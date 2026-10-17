import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/src/features/auth/components/auth-ui";
import { LoginForm } from "@/src/features/auth/components/auth-forms";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Nomsa Tour Guides account.",
  robots: { index: false, follow: false },
};

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; verified?: string; mfaEnabled?: string }>;
}) {
  const { callbackUrl, verified, mfaEnabled } = await searchParams;

  return (
    <>
      {verified === "1" ? (
        <p className="auth-notice auth-notice-success" role="status">
          Your email has been verified. You can sign in now.
        </p>
      ) : null}
      {mfaEnabled === "1" ? (
        <p className="auth-notice auth-notice-success" role="status">
          Two-factor authentication is enabled. Sign in with your current authenticator app code.
        </p>
      ) : null}
      <LoginForm callbackUrl={callbackUrl} />
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; verified?: string; mfaEnabled?: string }>;
}) {
  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="Good to have you here."
      description="Sign in to continue discovering South Africa with local expertise."
    >
      <Suspense fallback={<p className="auth-description">Preparing sign-in…</p>}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
