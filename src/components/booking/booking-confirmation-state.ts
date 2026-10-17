import type { BookingRecordSummary } from "@/src/server/services/booking-service";

export function bookingStatusLabel(status: BookingRecordSummary["status"]): string {
  const labels: Record<BookingRecordSummary["status"], string> = {
    PENDING: "Booking pending",
    AWAITING_PAYMENT: "Awaiting payment",
    CONFIRMED: "Booking confirmed",
    CHECKED_IN: "Experience in progress",
    COMPLETED: "Experience completed",
    CANCELLED: "Booking cancelled",
    REFUND_REQUESTED: "Refund requested",
    REFUNDED: "Booking refunded",
    NO_SHOW: "Marked as no-show",
  };

  return labels[status];
}

export function paymentStatusLabel(status: BookingRecordSummary["paymentStatus"]): string {
  const labels: Record<BookingRecordSummary["paymentStatus"], string> = {
    PENDING: "Payment pending",
    PROCESSING: "Payment processing",
    SUCCEEDED: "Payment succeeded",
    FAILED: "Payment failed",
    CANCELLED: "Payment cancelled",
    REFUND_PENDING: "Refund pending",
    REFUNDED: "Payment refunded",
  };

  return labels[status];
}

export function confirmationMessage(booking: BookingRecordSummary): {
  title: string;
  description: string;
  tone: "success" | "pending" | "attention";
} {
  if (booking.status === "CONFIRMED" && booking.paymentStatus === "SUCCEEDED") {
    return {
      title: "Your experience is confirmed",
      description: "Your booking is confirmed and the payment status is recorded as successful.",
      tone: "success",
    };
  }

  if (booking.paymentStatus === "PENDING" || booking.paymentStatus === "PROCESSING") {
    return {
      title: "Your booking has been created",
      description: "PayFast has not yet recorded a completed payment. This booking is not confirmed.",
      tone: "pending",
    };
  }

  if (booking.paymentStatus === "FAILED") {
    return {
      title: "Payment was not completed",
      description: "The payment status is recorded as failed, so this booking is not confirmed.",
      tone: "attention",
    };
  }

  if (booking.paymentStatus === "CANCELLED") {
    return {
      title: "Payment was cancelled",
      description: "The payment status is recorded as cancelled, so this booking is not confirmed.",
      tone: "attention",
    };
  }

  if (booking.paymentStatus === "REFUND_PENDING" || booking.paymentStatus === "REFUNDED") {
    return {
      title: "Payment update",
      description: `The recorded payment status is ${paymentStatusLabel(booking.paymentStatus).toLowerCase()}. The booking is not confirmed.`,
      tone: "attention",
    };
  }

  return {
    title: bookingStatusLabel(booking.status),
    description: `The current payment status is ${paymentStatusLabel(booking.paymentStatus).toLowerCase()}.`,
    tone: booking.status === "CONFIRMED" ? "success" : "attention",
  };
}

export function isBookingAndPaymentConfirmed(booking: BookingRecordSummary): boolean {
  return booking.status === "CONFIRMED" && booking.paymentStatus === "SUCCEEDED";
}

export type RefundState =
  | "none"
  | "cancelled-no-refund"
  | "requested"
  | "pending"
  | "completed"
  | "failed-then-cancelled";

/**
 * Derives the honest, displayable refund state from persisted booking +
 * payment statuses. There is no automated refund execution flow in this
 * release: PayFast ITN only ever moves a late/duplicate payment to
 * REFUND_PENDING, and nothing in the codebase transitions a payment to
 * REFUNDED via a provider call. Callers must not claim a completed refund
 * unless this helper returns "completed".
 */
export function refundStateForBooking(booking: BookingRecordSummary): RefundState {
  if (booking.status === "REFUNDED" && booking.paymentStatus === "REFUNDED") {
    return "completed";
  }
  if (booking.status === "REFUND_REQUESTED" || booking.paymentStatus === "REFUND_PENDING") {
    if (booking.paymentStatus === "REFUND_PENDING") {
      return "pending";
    }
    return "requested";
  }
  if (booking.status === "CANCELLED" && booking.paymentStatus === "FAILED") {
    return "failed-then-cancelled";
  }
  if (booking.status === "CANCELLED") {
    return "cancelled-no-refund";
  }
  return "none";
}

export function refundStatusCopy(state: RefundState): { title: string; description: string } {
  switch (state) {
    case "requested":
      return {
        title: "Refund requested",
        description:
          "This booking was cancelled and a refund has been requested. Refund processing is pending.",
      };
    case "pending":
      return {
        title: "Refund pending",
        description:
          "This booking was cancelled and refund handling is awaiting processing. Refund completion is not yet available in this release.",
      };
    case "completed":
      return {
        title: "Refunded",
        description: "The recorded booking and payment statuses show this booking as refunded.",
      };
    case "failed-then-cancelled":
      return {
        title: "Booking cancelled",
        description:
          "The payment was not completed, so this booking was cancelled. No refund applies because no payment was recorded as successful.",
      };
    case "cancelled-no-refund":
      return {
        title: "Booking cancelled",
        description:
          "This booking was cancelled. No completed refund is recorded for this booking.",
      };
    case "none":
      return {
        title: "No refund activity",
        description: "No cancellation or refund is recorded for this booking.",
      };
  }
}

export function isPaymentRecordedForBooking(booking: BookingRecordSummary): boolean {
  return (
    booking.paymentStatus === "SUCCEEDED" &&
    ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(booking.status)
  );
}
