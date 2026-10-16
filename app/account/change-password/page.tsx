import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/src/features/auth/components/auth-ui";
import { ChangePasswordForm } from "@/src/features/auth/components/auth-forms";
import { getCurrentUser } from "@/src/lib/auth/session";

async function ChangePasswordContent() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=%2Faccount%2Fchange-password");
  }

  return <ChangePasswordForm />;
}

export default function ChangePasswordPage() {
  return (
    <AuthShell
      eyebrow="ACCOUNT SECURITY"
      title="Update your password."
      description="Choose a strong password to keep your account protected. You will need to sign in again after changing it."
    >
      <Suspense fallback={<p className="auth-description">Checking your session…</p>}>
        <ChangePasswordContent />
      </Suspense>
    </AuthShell>
  );
}
