import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/src/features/auth/components/auth-ui";
import { TwoFactorSetup } from "@/src/features/auth/components/two-factor-setup";
import { requiresAuthenticatorApp } from "@/src/features/auth/lib/privileged-mfa";
import { getCurrentUser } from "@/src/lib/auth/session";

export const metadata: Metadata = {
  title: "Two-factor authentication",
  robots: { index: false, follow: false },
};

export default async function TwoFactorSetupPage() {
  return (
    <Suspense
      fallback={
        <AuthShell
          eyebrow="ACCOUNT SECURITY"
          title="Secure your account."
          description="Complete authenticator app setup before continuing."
        >
          <p className="text-sm text-muted-foreground">Loading your security setup…</p>
        </AuthShell>
      }
    >
      <TwoFactorSetupContent />
    </Suspense>
  );
}

async function TwoFactorSetupContent() {
  const principal = await getCurrentUser();
  if (!principal) {
    redirect("/login?callbackUrl=%2Faccount%2Fsecurity%2Ftwo-factor");
  }
  if (!requiresAuthenticatorApp(principal.role)) {
    redirect("/dashboard");
  }
  if (principal.mfaVerified) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      eyebrow="ACCOUNT SECURITY"
      title="Secure your account."
      description="Complete authenticator app setup before continuing."
    >
      <TwoFactorSetup />
    </AuthShell>
  );
}
