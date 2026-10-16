import type { Metadata } from "next";
import { AuthShell } from "@/src/features/auth/components/auth-ui";
import { RegistrationForm } from "@/src/features/auth/components/auth-forms";

export const metadata: Metadata = {
  title: "Create an account | Nomsa Tour Guides",
  description: "Join Nomsa Tour Guides as a traveller or local guide.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="JOIN THE JOURNEY"
      title="Your next story starts here."
      description="Create an account to plan a more personal journey through South Africa."
    >
      <RegistrationForm />
    </AuthShell>
  );
}
