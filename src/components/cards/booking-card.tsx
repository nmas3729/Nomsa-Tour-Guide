import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { formatCurrency, formatDate } from "@/src/lib/format";
import {
  bookingStatusLabel,
  paymentStatusLabel,
  refundStateForBooking,
  refundStatusCopy,
  type RefundState,
} from "@/src/components/booking/booking-confirmation-state";

import type { BookingStatus, PaymentStatus } from "@/src/server/db/generated/enums";

export type DashboardBooking = {
  id: string;
  experienceDate: Date | string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalPrice: number | string | { toString(): string };
  currency: string;
  travellerCount?: number | null;
  experience: {
    title: string;
    slug: string;
    meetingPoint?: string | null;
    destination?: {
      name: string;
      city?: { province?: { name: string } } | null;
    } | null;
  };
};

function statusBadgeVariant(
  kind: "booking" | "payment" | "refund",
  status: BookingStatus | PaymentStatus | RefundState,
): "success" | "warning" | "destructive" | "secondary" | "default" | "outline" {
  if (kind === "refund") {
    if (status === "completed") return "success";
    if (status === "requested" || status === "pending") return "warning";
    return "secondary";
  }
  if (
    status === "SUCCEEDED" ||
    status === "CONFIRMED" ||
    status === "COMPLETED" ||
    status === "CHECKED_IN"
  ) {
    return "success";
  }
  if (
    status === "PENDING" ||
    status === "PROCESSING" ||
    status === "AWAITING_PAYMENT" ||
    status === "REFUND_PENDING" ||
    status === "REFUND_REQUESTED"
  ) {
    return "warning";
  }
  if (status === "FAILED") return "destructive";
  if (status === "CANCELLED") return kind === "payment" ? "secondary" : "destructive";
  return "secondary";
}

/**
 * Premium, scannable booking card for the customer and guide dashboards.
 * Shows only persisted facts: title, date, travellers, price, and the
 * booking / payment / refund states separately. Never implies a completed
 * refund, invoice, voucher, or support coverage that does not exist.
 *
 * Pass `tone="host"` on the guide dashboard for host-facing copy
 * ("guests" instead of "travellers", "Booking total" instead of "Total",
 * preparation-only action cues with no traveller-facing links).
 */
export function BookingCard({ booking, tone = "guest" }: { booking: DashboardBooking; tone?: "guest" | "host" }) {
  const refundState = refundStateForBooking({
    status: booking.status,
    paymentStatus: booking.paymentStatus,
  } as Parameters<typeof refundStateForBooking>[0]);
  const refundCopy = refundStatusCopy(refundState);
  const showRefund = refundState !== "none";
  const travellerCount = typeof booking.travellerCount === "number" ? booking.travellerCount : null;
  const guestWord = tone === "host" ? "guest" : "traveller";
  const guestWordPlural = tone === "host" ? "guests" : "travellers";
  const destination = booking.experience.destination ?? null;
  const provinceName = destination?.city?.province?.name ?? null;
  const meetingPoint = booking.experience.meetingPoint?.trim() || null;
  const bookingRef = booking.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const actionNeeded =
    booking.paymentStatus === "PENDING" ||
    booking.paymentStatus === "PROCESSING" ||
    booking.paymentStatus === "FAILED";
  const hostActionNeeded =
    actionNeeded ||
    booking.status === "PENDING" ||
    booking.status === "AWAITING_PAYMENT";

  return (
    <Card className="booking-history-card group">
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Booking states">
            <Badge variant="outline" title={booking.id}>
              Booking ref · {bookingRef}
            </Badge>
            <Badge variant={statusBadgeVariant("booking", booking.status)}>
              Booking · {bookingStatusLabel(booking.status)}
            </Badge>
            <Badge variant={statusBadgeVariant("payment", booking.paymentStatus)}>
              Payment · {paymentStatusLabel(booking.paymentStatus)}
            </Badge>
            {showRefund ? (
              <Badge variant={statusBadgeVariant("refund", refundState)}>
                Refund · {refundCopy.title}
              </Badge>
            ) : null}
          </div>
          <p className="shrink-0 pl-0 text-left sm:text-right">
            <span className="block font-display text-xl font-semibold tracking-tight text-foreground">
              {formatCurrency(Number(booking.totalPrice), booking.currency)}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {tone === "host" ? `Booking total · ${booking.currency}` : `Total · ${booking.currency}`}
            </span>
          </p>
        </div>

        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-primary" />
            {formatDate(booking.experienceDate)}
          </p>
          <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug tracking-tight text-foreground">
            <Link
              className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/experiences/${booking.experience.slug}`}
            >
              {booking.experience.title}
            </Link>
          </h3>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />
            {destination
              ? provinceName
                ? `${destination.name} · ${provinceName}`
                : destination.name
              : "Destination not recorded for this booking."}
          </p>
          {travellerCount !== null ? (
            <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
              <Users aria-hidden="true" className="size-4 shrink-0 text-primary" />
              {travellerCount} {travellerCount === 1 ? guestWord : guestWordPlural}
            </p>
          ) : null}
        </div>

        {showRefund ? (
          <p className="rounded-xl bg-secondary/50 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {refundCopy.description}
          </p>
        ) : null}

        {actionNeeded && tone === "guest" ? (
          <p className="text-xs font-medium leading-relaxed text-foreground">
            {booking.paymentStatus === "FAILED"
              ? "This payment was not completed — you can revisit the experience to try booking again."
              : "This payment is still being recorded — check back shortly before booking again."}{" "}
            <Link
              className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
              href={`/experiences/${booking.experience.slug}/book`}
            >
              Return to this experience
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </p>
        ) : null}

        {hostActionNeeded && tone === "host" ? (
          <p className="text-xs font-medium leading-relaxed text-foreground">
            {booking.paymentStatus === "FAILED"
              ? "No preparation is needed unless the guest rebooks; payment is recorded as failed."
              : "Hold preparations until booking is confirmed and payment is successful."}
          </p>
        ) : null}

        <p className="flex items-center gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
          {tone === "host" && meetingPoint
            ? `Meeting point · ${meetingPoint}`
            : tone === "host"
              ? "Meeting point not listed for this experience."
              : "View meeting-point details on the experience page."}
        </p>
      </CardContent>
    </Card>
  );
}
