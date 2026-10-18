import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserRole } from "@/src/server/db/generated/enums";
import { Container } from "@/src/components/layout/container";
import { Section } from "@/src/components/layout/section";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { CustomItineraryRequestForm } from "@/src/components/booking/custom-itinerary-request-form";
import { publicPageMetadata } from "@/src/lib/seo";
import { getCurrentUser } from "@/src/lib/auth/session";

export const metadata: Metadata = publicPageMetadata({
  title: "Request a Custom Itinerary",
  description: "Share your travel plans with Nomsa Tour Guides and request a tailored itinerary.",
  path: "/custom-itinerary",
  robots: { index: false, follow: false },
});

export default async function CustomItineraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fcustom-itinerary");
  if (user.role !== UserRole.CUSTOMER) redirect("/dashboard");

  return (
    <PublicLayout>
      <Section>
        <Container className="max-w-3xl">
          <header className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Request to book</p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">Plan a custom itinerary</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Tell us where and how you want to travel. The team will review your request separately from instant experience bookings.
            </p>
          </header>
          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-8">
            <CustomItineraryRequestForm />
          </div>
        </Container>
      </Section>
    </PublicLayout>
  );
}
