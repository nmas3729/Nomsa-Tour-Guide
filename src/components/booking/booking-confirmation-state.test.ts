import { describe, expect, it } from "vitest";
import type { BookingRecordSummary } from "@/src/server/services/booking-service";
import {
  bookingStatusLabel,
  confirmationMessage,
  isPaymentRecordedForBooking,
  paymentStatusLabel,
  refundStateForBooking,
  refundStatusCopy,
} from "./booking-confirmation-state";

const booking = (overrides: Partial<BookingRecordSummary> = {}): BookingRecordSummary => ({
  id: "booking-id",
  reference: "NOM-TEST-REFERENCE",
  experienceTitle: "Bo-Kaap heritage walk",
  experienceSlug: "bo-kaap-heritage-walk",
  guideName: "Thandi Mokoena",
  destination: "Cape Town, Western Cape",
  date: "2026-12-12",
  timeSlot: "09:00 AM",
  travellerCount: 2,
  adultsCount: 2,
  childrenCount: 0,
  leadEmail: "traveller@example.com",
  leadName: "Example Traveller",
  totalPrice: 1300,
  currency: "ZAR",
  status: "AWAITING_PAYMENT",
  paymentStatus: "PENDING",
  meetingPoint: "",
  createdAt: "2026-10-16T10:00:00.000Z",
  ...overrides,
});

describe("booking and payment state presentation", () => {
  it.each([
    ["PENDING", "Booking pending"],
    ["AWAITING_PAYMENT", "Awaiting payment"],
    ["CONFIRMED", "Booking confirmed"],
    ["CANCELLED", "Booking cancelled"],
    ["REFUND_REQUESTED", "Refund requested"],
    ["REFUNDED", "Booking refunded"],
  ] as const)("labels booking status %s independently", (status, label) => {
    expect(bookingStatusLabel(status)).toBe(label);
  });

  it.each([
    ["PENDING", "Payment pending"],
    ["PROCESSING", "Payment processing"],
    ["SUCCEEDED", "Payment succeeded"],
    ["FAILED", "Payment failed"],
    ["CANCELLED", "Payment cancelled"],
    ["REFUNDED", "Payment refunded"],
  ] as const)("labels payment status %s independently", (status, label) => {
    expect(paymentStatusLabel(status)).toBe(label);
  });

  it("only describes a confirmed experience when booking and payment both support it", () => {
    expect(
      confirmationMessage(booking({ status: "CONFIRMED", paymentStatus: "SUCCEEDED" })),
    ).toMatchObject({ title: "Your experience is confirmed", tone: "success" });

    expect(
      confirmationMessage(booking({ status: "CONFIRMED", paymentStatus: "PENDING" })),
    ).toMatchObject({ title: "Your booking has been created", tone: "pending" });
    expect(
      confirmationMessage(booking({ status: "AWAITING_PAYMENT", paymentStatus: "SUCCEEDED" })),
    ).not.toMatchObject({ title: "Your experience is confirmed" });
  });

  it.each([
    ["PENDING", "Your booking has been created"],
    ["PROCESSING", "Your booking has been created"],
    ["FAILED", "Payment was not completed"],
    ["CANCELLED", "Payment was cancelled"],
    ["REFUND_PENDING", "Payment update"],
    ["REFUNDED", "Payment update"],
  ] as const)("keeps %s payment wording accurate", (paymentStatus, title) => {
    expect(confirmationMessage(booking({ paymentStatus })).title).toBe(title);
  });

  it("recognizes when successful payment is associated with a current booking", () => {
    expect(isPaymentRecordedForBooking(booking({ status: "CONFIRMED", paymentStatus: "SUCCEEDED" }))).toBe(true);
    expect(isPaymentRecordedForBooking(booking({ status: "CANCELLED", paymentStatus: "SUCCEEDED" }))).toBe(false);
    expect(isPaymentRecordedForBooking(booking({ status: "CONFIRMED", paymentStatus: "PENDING" }))).toBe(false);
  });

  it("describes a requested refund as pending, not completed", () => {
    const message = confirmationMessage(
      booking({ status: "REFUND_REQUESTED", paymentStatus: "REFUND_PENDING" }),
    );

    expect(message).toMatchObject({ title: "Payment update", tone: "attention" });
    expect(message.description).toContain("refund pending");
    expect(message.description).not.toContain("payment refunded");
    expect(isPaymentRecordedForBooking(
      booking({ status: "REFUND_REQUESTED", paymentStatus: "REFUND_PENDING" }),
    )).toBe(false);
  });

  it("uses refunded wording only for persisted refunded status", () => {
    expect(paymentStatusLabel("REFUNDED")).toBe("Payment refunded");
    expect(bookingStatusLabel("REFUNDED")).toBe("Booking refunded");
  });

  it.each([
    ["CANCELLED", "CANCELLED", "cancelled-no-refund", "Booking cancelled"],
    ["CANCELLED", "FAILED", "failed-then-cancelled", "Booking cancelled"],
    ["REFUND_REQUESTED", "PENDING", "requested", "Refund requested"],
    ["REFUND_REQUESTED", "REFUND_PENDING", "pending", "Refund pending"],
    ["CANCELLED", "REFUND_PENDING", "pending", "Refund pending"],
    ["REFUNDED", "REFUNDED", "completed", "Refunded"],
    ["CONFIRMED", "SUCCEEDED", "none", "No refund activity"],
    ["AWAITING_PAYMENT", "PENDING", "none", "No refund activity"],
  ] as const)(
    "derives refund state %s / %s as %s without overstating completion",
    (status, paymentStatus, expectedState, expectedTitle) => {
      const state = refundStateForBooking(booking({ status, paymentStatus }));
      expect(state).toBe(expectedState);
      expect(refundStatusCopy(state).title).toBe(expectedTitle);
      if (expectedState !== "completed") {
        expect(refundStatusCopy(state).title).not.toBe("Refunded");
        expect(refundStatusCopy(state).description).not.toMatch(/has been refunded|refund complete/i);
      }
    },
  );

  it("labels pending refund copy as awaiting processing, never completed", () => {
    for (const state of ["requested", "pending"] as const) {
      const copy = refundStatusCopy(state);
      expect(copy.description).toMatch(/pending|awaiting processing/i);
      expect(copy.description).toMatch(/not yet available in this release|processing is pending/i);
      expect(copy.description).not.toMatch(/has been refunded|refund complete|payment refunded/i);
    }
  });

  it("never reports a completed refund for failed-then-cancelled bookings", () => {
    const state = refundStateForBooking(booking({ status: "CANCELLED", paymentStatus: "FAILED" }));
    expect(state).toBe("failed-then-cancelled");
    expect(refundStatusCopy(state).description).toMatch(/No refund applies/i);
    expect(isPaymentRecordedForBooking(booking({ status: "CANCELLED", paymentStatus: "FAILED" }))).toBe(false);
  });
});
