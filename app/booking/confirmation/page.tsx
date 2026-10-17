import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingConfirmationView } from "@/src/components/booking/booking-confirmation-view";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Booking Details",
  description: "Review your booking details and payment status.",
  path: "/booking/confirmation",
  robots: { index: false, follow: false },
});

export default function BookingConfirmationPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div aria-live="polite" className="min-h-[60vh] grid place-items-center text-sm text-muted-foreground">Loading booking details...</div>}>
        <BookingConfirmationView />
      </Suspense>
    </PublicLayout>
  );
}
