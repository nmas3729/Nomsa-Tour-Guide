"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Container } from "@/src/components/layout/container";
import { Section } from "@/src/components/layout/section";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { BookingRecordSummary } from "@/src/server/services/booking-service";
import {
  bookingStatusLabel,
  confirmationMessage,
  isInvoiceAvailable,
  isPaymentRecordedForBooking,
  paymentStatusLabel,
  refundStateForBooking,
  refundStatusCopy,
} from "@/src/components/booking/booking-confirmation-state";

export function BookingConfirmationView() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<BookingRecordSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
        } else if (res.status === 404) {
          setLoadError("This booking could not be found or is no longer available.");
        } else {
          setLoadError("Booking details are temporarily unavailable. Please try again shortly.");
        }
      } catch {
        setLoadError("Booking details are temporarily unavailable. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <Section className="booking-confirmation-section py-12 sm:py-20">
        <Container className="max-w-3xl">
          <div aria-live="polite" className="booking-confirmation-panel glass-panel glass-panel--floating flex min-h-72 flex-col items-center justify-center rounded-[2rem] p-8 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Clock3 aria-hidden="true" className="size-6" />
            </span>
            <p className="mt-5 font-display text-xl font-semibold">Checking your booking</p>
            <p className="mt-2 text-sm text-muted-foreground">Loading the latest booking and payment status.</p>
          </div>
        </Container>
      </Section>
    );
  }

  if (!booking) {
    return (
      <Section className="booking-confirmation-section py-12 sm:py-20">
        <Container className="max-w-3xl">
          <div className="booking-confirmation-panel glass-panel glass-panel--floating rounded-[2rem] p-7 text-center sm:p-12">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
              <AlertCircle aria-hidden="true" className="size-6" />
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Booking details</p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">Booking not available</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {loadError || "No booking reference was provided, so booking details cannot be displayed."}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/experiences">Browse experiences</Link>
              </Button>
              {loadError ? (
                <Button asChild variant="outline">
                  <Link href="/contact">Contact Nomsa</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>
    );
  }

  const message = confirmationMessage(booking);
  const paymentRecordedForBooking = isPaymentRecordedForBooking(booking);
  const invoiceAvailable = isInvoiceAvailable(booking);
  const refundState = refundStateForBooking(booking);
  const refundCopy = refundStatusCopy(refundState);
  const showRefundSection = refundState !== "none";
  const StatusIcon = message.tone === "success" ? CheckCircle2 : message.tone === "pending" ? Clock3 : AlertCircle;
  const destination = booking.destination.trim();
  const experienceHref = `/experiences/${booking.experienceSlug}`;

  return (
    <Section className="booking-confirmation-section py-10 sm:py-16">
      <Container className="max-w-4xl">
        <div className="booking-confirmation-panel glass-panel glass-panel--floating overflow-hidden rounded-[2rem]">
          <header className="booking-confirmation-header px-6 py-8 text-center sm:px-12 sm:py-12">
            <span
              className={`mx-auto grid size-16 place-items-center rounded-full ${
                message.tone === "success"
                  ? "bg-primary/10 text-primary"
                  : message.tone === "pending"
                    ? "bg-accent/15 text-highlight"
                    : "bg-destructive/10 text-destructive"
              }`}
            >
              <StatusIcon aria-hidden="true" className="size-8" />
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {bookingStatusLabel(booking.status)}
            </p>
            <h1 className="mx-auto mt-2 max-w-2xl font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
              {message.title}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {message.description}
            </p>
          </header>

          <div className="px-5 pb-6 sm:px-10 sm:pb-10">
            <div className="booking-confirmation-summary rounded-3xl border border-border/60 bg-card/75 p-5 sm:p-7">
              <div className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Booking reference</p>
                  <p className="mt-1 break-all font-mono text-sm font-bold tracking-wide text-primary sm:text-base">
                    {booking.reference || "Not available"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
                    Booking: {bookingStatusLabel(booking.status)}
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
                    Payment: {paymentStatusLabel(booking.paymentStatus)}
                  </span>
                  {showRefundSection ? (
                    <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
                      Refund: {refundCopy.title}
                    </span>
                  ) : null}
                </div>
              </div>

              {showRefundSection ? (
                <section
                  aria-label="Refund status"
                  className="mt-5 rounded-2xl border border-border/60 bg-secondary/40 p-4 sm:p-5"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Refund status
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">{refundCopy.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{refundCopy.description}</p>
                </section>
              ) : null}

              {invoiceAvailable ? (
                <section
                  aria-label="Payment receipt"
                  className="mt-5 flex flex-col gap-4 rounded-2xl border border-border/60 bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Payment receipt
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-foreground">Receipt PDF available</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {booking.invoiceEmailStatus === "SENT"
                          ? `Receipt emailed to ${booking.leadEmail || "the booking email address"}.`
                        : booking.invoiceEmailStatus === "FAILED"
                            ? "Receipt email delivery failed. You can download the PDF here."
                          : booking.invoiceEmailStatus === "SENDING"
                              ? "Receipt email delivery is in progress."
                            : "Email delivery has not been confirmed. You can download the PDF here."}
                    </p>
                  </div>
                  <Button asChild className="shrink-0 rounded-full">
                    <a download href={`/api/bookings/${booking.id}/invoice`}>
                      Download receipt
                      <Download aria-hidden="true" className="size-4" />
                    </a>
                  </Button>
                </section>
              ) : null}

              <div className="py-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Your experience</p>
                <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                  {booking.experienceTitle || "Experience details not available"}
                </h2>
                <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{destination || "Destination and province not listed"}</span>
                </p>
              </div>

              <dl className="grid gap-x-6 gap-y-5 border-t border-border/60 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <CalendarDays aria-hidden="true" className="size-3.5 text-primary" />
                    Date &amp; time
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-foreground">
                    {booking.date ? formatDate(booking.date, { dateStyle: "medium", timeZone: "UTC" }) : "Not listed"}
                  </dd>
                  {booking.timeSlot ? <dd className="mt-0.5 text-xs text-muted-foreground">{booking.timeSlot}</dd> : null}
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <Users aria-hidden="true" className="size-3.5 text-primary" />
                    Travellers
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-foreground">
                    {booking.travellerCount > 0
                      ? `${booking.travellerCount} ${booking.travellerCount === 1 ? "traveller" : "travellers"}`
                      : "Not listed"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Host</dt>
                  <dd className="mt-1.5 text-sm font-semibold text-foreground">{booking.guideName || "Not listed"}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <CreditCard aria-hidden="true" className="size-3.5 text-primary" />
                    Total
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-foreground">
                    {Number.isFinite(booking.totalPrice) ? formatCurrency(booking.totalPrice, booking.currency || "ZAR") : "Not listed"}
                  </dd>
                  <dd className="mt-0.5 text-xs text-muted-foreground">
                    {paymentStatusLabel(booking.paymentStatus)}
                  </dd>
                </div>
              </dl>

              <section aria-label="Booking price breakdown" className="mt-6 rounded-2xl border border-border/60 bg-secondary/30 p-4 sm:p-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Price breakdown</h2>
                {booking.baseAmount == null ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    A detailed price breakdown was not recorded for this older booking. Recorded total:{" "}
                    {formatCurrency(booking.totalPrice, booking.currency || "ZAR")}.
                  </p>
                ) : (
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Base price</dt>
                      <dd>{formatCurrency(booking.baseAmount, booking.currency || "ZAR")}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Optional extras</dt>
                      <dd>{formatCurrency(booking.optionalExtrasAmount ?? 0, booking.currency || "ZAR")}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Transport</dt>
                      <dd>{formatCurrency(booking.transportAmount ?? 0, booking.currency || "ZAR")}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Platform fee</dt>
                      <dd>{formatCurrency(booking.platformFeeAmount ?? 0, booking.currency || "ZAR")}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Taxes</dt>
                      <dd>{formatCurrency(booking.taxAmount ?? 0, booking.currency || "ZAR")}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-border/60 pt-2 font-semibold">
                      <dt>Total payable</dt>
                      <dd>{formatCurrency(booking.totalPrice, booking.currency || "ZAR")}</dd>
                    </div>
                    {(booking.refundedAmount ?? 0) > 0 ? (
                      <div className="flex justify-between gap-4 text-muted-foreground">
                        <dt>Refund recorded</dt>
                        <dd>{formatCurrency(booking.refundedAmount ?? 0, booking.currency || "ZAR")}</dd>
                      </div>
                    ) : null}
                  </dl>
                )}
              </section>
              {booking.agreedTermsSnapshot ? (
                <section aria-label="Accepted itinerary offer" className="mt-5 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
                  <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Accepted itinerary offer</h2>
                  <p className="mt-3 text-sm font-semibold">{booking.agreedTermsSnapshot.experienceTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.agreedTermsSnapshot.destination} · {booking.agreedTermsSnapshot.durationMinutes} minutes
                  </p>
                  {booking.agreedTermsSnapshot.meetingPoint ? (
                    <p className="mt-2 text-sm"><span className="font-medium">Meeting point:</span> {booking.agreedTermsSnapshot.meetingPoint}</p>
                  ) : null}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold">Included</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {booking.agreedTermsSnapshot.inclusions.length
                          ? booking.agreedTermsSnapshot.inclusions.join(", ")
                          : "No inclusions listed"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Not included</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {booking.agreedTermsSnapshot.exclusions.length
                          ? booking.agreedTermsSnapshot.exclusions.join(", ")
                          : "No exclusions listed"}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="booking-confirmation-note rounded-2xl p-5">
                <h2 className="font-display text-lg font-semibold">What to know next</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {paymentRecordedForBooking
                    ? "Keep your booking reference for your records. Visit the experience page to review the meeting point and itinerary details listed for this outing."
                    : booking.paymentStatus === "DISPUTED"
                      ? `Booking status remains ${bookingStatusLabel(booking.status)}. Payment is disputed and is not treated as cleared for guide payout.`
                      : booking.paymentStatus === "PARTIALLY_REFUNDED"
                        ? `Booking status remains ${bookingStatusLabel(booking.status)}. The recorded refund is shown in the price breakdown above.`
                    : booking.paymentStatus === "PENDING" || booking.paymentStatus === "PROCESSING"
                      ? "The latest recorded payment is still pending. This page reflects the current booking status and does not confirm payment."
                      : booking.paymentStatus === "REFUND_PENDING" || booking.paymentStatus === "REFUNDED"
                        ? "The booking and payment statuses above reflect the latest details available here. Contact Nomsa with your reference if you need help understanding this payment update."
                        : "This booking is not confirmed. Check the current payment status before making another booking."}
                </p>
                <div className="mt-3 border-t border-border/50 pt-3">
                  <h3 className="text-xs font-semibold text-foreground">Cancellation terms saved at booking</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {booking.cancellationPolicySnapshot || "Cancellation terms were not recorded for this older booking."}
                  </p>
                </div>
                {booking.bookingType === "REQUEST_TO_BOOK" && booking.customRequestId ? (
                  <div className="mt-3 border-t border-border/50 pt-3">
                    <Link
                      className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                      href="/dashboard#custom-itinerary-requests"
                    >
                      Open itinerary messages in your dashboard
                    </Link>
                  </div>
                ) : null}
              </section>

              <div className="flex flex-col justify-center gap-3 rounded-2xl bg-secondary/45 p-5">
                <Button asChild className="min-h-12 justify-between rounded-full">
                  <Link href={experienceHref}>
                    View experience details
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
                <Button asChild className="min-h-12 rounded-full" variant="outline">
                  <Link href="/experiences">Explore more South African experiences</Link>
                </Button>
                <Button asChild className="min-h-12 rounded-full" variant="outline">
                  <Link href="/contact">Contact Nomsa support</Link>
                </Button>
                {booking.paymentStatus === "FAILED" || booking.paymentStatus === "CANCELLED" ? (
                  <Link
                    className="text-center text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    href={`/experiences/${booking.experienceSlug}/book`}
                  >
                    Return to this experience
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
