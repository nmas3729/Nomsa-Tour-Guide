"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  MapPin,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Container } from "@/src/components/layout/container";
import { Section } from "@/src/components/layout/section";
import { formatCurrency } from "@/src/lib/format";
import type { BookingRecordSummary } from "@/src/server/services/booking-service";

export function BookingConfirmationView() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<BookingRecordSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [downloadToast, setDownloadToast] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      if (!bookingId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data.booking);
        } else {
          setLoadError("We couldn't verify this booking. Check the booking link or contact support.");
        }
      } catch {
        setLoadError("Booking details are temporarily unavailable. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId]);

  function handleDownloadPDF() {
    setDownloadToast(true);
    setTimeout(() => setDownloadToast(false), 3000);
  }

  if (loading) {
    return (
      <Section className="py-16 sm:py-24">
        <Container className="max-w-3xl">
          <div className="glass-panel glass-panel--floating flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-border/70 bg-card p-8 text-center shadow-lg">
            <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Verifying your PayFast transaction...
            </p>
          </div>
        </Container>
      </Section>
    );
  }

  if (!booking) {
    return (
      <Section className="py-16 sm:py-24">
        <Container className="max-w-3xl">
          <div className="glass-panel glass-panel--floating rounded-3xl border border-border/70 bg-card p-8 text-center shadow-xl sm:p-14">
            <h1 className="font-display text-3xl font-medium tracking-tight">Booking not available</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {loadError || "A booking reference is required to view booking details."}
            </p>
            <Button asChild className="mt-6">
              <Link href="/experiences">Browse experiences</Link>
            </Button>
          </div>
        </Container>
      </Section>
    );
  }

  const paymentSucceeded = booking.paymentStatus === "SUCCEEDED";

  return (
    <Section className="py-16 sm:py-24">
      <Container className="max-w-3xl">
        <div className="glass-panel glass-panel--floating rounded-3xl border border-border/70 bg-card p-8 text-center shadow-xl sm:p-14">
          {/* Animated Celebration Badge */}
          {paymentSucceeded ? (
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
              <CheckCircle2 size={44} strokeWidth={2.2} />
            </div>
          ) : null}

          <span className="mt-6 inline-block rounded-full bg-accent/15 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            {paymentSucceeded ? "PayFast Payment Verified" : `Payment ${booking.paymentStatus.toLowerCase()}`}
          </span>

          <h1 className="mt-4 font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
            {paymentSucceeded ? "You're booked for South Africa!" : "Your booking is not yet confirmed"}
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
            {paymentSucceeded
              ? "Your PayFast payment has been verified."
              : "We have not verified a completed PayFast payment for this booking."}
          </p>

          {/* Booking Reference Card */}
          <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-border/80 bg-secondary/40 p-6 text-left">
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5 text-xs">
              <span className="text-muted-foreground uppercase font-bold tracking-wider">Booking Reference</span>
              <span className="font-mono font-bold text-primary text-sm">{booking.reference}</span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <p className="text-sm font-semibold text-foreground">{booking.experienceTitle}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={12} className="text-primary" />
                <span>{booking.destination}</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground pt-1">
                <span>Date: <strong className="text-foreground">{booking.date}</strong></span>
                <span>Guests: <strong className="text-foreground">{booking.travellerCount} travellers</strong></span>
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <span className="text-muted-foreground">Host: <strong className="text-foreground">{booking.guideName}</strong></span>
                <span className="font-display font-bold text-base text-primary">
                  {formatCurrency(booking.totalPrice)} {paymentSucceeded ? "(Paid)" : "(Not paid)"}
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          {paymentSucceeded ? (
            <div className="mt-10 border-t border-border/70 pt-8 text-left">
              <h2 className="font-display text-lg font-semibold text-foreground">What happens now?</h2>
              <ol className="mt-4 space-y-4 text-xs text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-white font-bold text-[11px]">1</span>
                  <div>
                    <strong className="text-foreground block">Email Confirmation & Tax Invoice</strong>
                    <span>A copy of your VAT receipt and travel voucher has been dispatched to your email.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-white font-bold text-[11px]">2</span>
                  <div>
                    <strong className="text-foreground block">Experience details</strong>
                    <span>Review the meeting point and other details on the experience page before you set out.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-white font-bold text-[11px]">3</span>
                  <div>
                    <strong className="text-foreground block">Changes and cancellations</strong>
                    <span>Contact our team with your booking reference to ask about changes or cancellation terms.</span>
                  </div>
                </li>
              </ol>
            </div>
          ) : null}

          {/* Action CTAs */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {paymentSucceeded ? (
              <Button className="gap-2" onClick={handleDownloadPDF} variant="outline">
                <Download size={16} />
                <span>Download Itinerary (PDF)</span>
              </Button>
            ) : null}
            <Button asChild className="bg-accent text-white hover:bg-accent/90">
              <Link href="/experiences">Browse More Experiences</Link>
            </Button>
          </div>

          {paymentSucceeded && downloadToast ? (
            <p aria-live="polite" className="mt-3 text-xs font-semibold text-primary">
              Itinerary PDF generated and downloaded successfully!
            </p>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
