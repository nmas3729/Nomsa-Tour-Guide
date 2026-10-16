import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingConfirmationView } from "@/src/components/booking/booking-confirmation-view";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { publicPageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Booking Confirmed | Nomsa Tour Guides",
  description: "Your guided South African experience has been successfully reserved with PayFast.",
  path: "/booking/confirmation",
});

export default function BookingConfirmationPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading confirmation...</div>}>
        <BookingConfirmationView />
      </Suspense>
    </PublicLayout>
  );
}

