import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/src/features/auth/components/auth-ui";
import { LoginForm } from "@/src/features/auth/components/auth-forms";

export const metadata: Metadata = {
  title: "Sign in | Nomsa Tour Guides",
  description: "Sign in to your Nomsa Tour Guides account.",
};

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; verified?: string }>;
}) {
  const { callbackUrl, verified } = await searchParams;

  return (
    <>
      {verified === "1" ? (
        <p className="auth-notice auth-notice-success" role="status">
          Your email has been verified. You can sign in now.
        </p>
      ) : null}
      <LoginForm callbackUrl={callbackUrl} />
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; verified?: string }>;
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
