import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingCard } from "./booking-card";

vi.mock("next/link", () => ({
  default: "a",
}));

const baseBooking = {
  id: "booking-1",
  experienceDate: "2026-12-12T09:00:00.000Z",
  totalPrice: 1300,
  currency: "ZAR",
  travellerCount: 2,
  experience: {
    title: "Sunrise safari in the Greater Kruger",
    slug: "greater-kruger-sunrise-safari",
    meetingPoint: "Orpen Gate",
  },
} as const;

describe("BookingCard", () => {
  it("shows experience, date, travellers, and total without inventing extras", () => {
    render(
      <BookingCard
        booking={{ ...baseBooking, status: "CONFIRMED", paymentStatus: "SUCCEEDED" }}
      />,
    );

    expect(screen.getByText("Sunrise safari in the Greater Kruger")).toBeInTheDocument();
    expect(screen.getByText("2 travellers")).toBeInTheDocument();
    expect(screen.getByText("Booking · Booking confirmed")).toBeInTheDocument();
    expect(screen.getByText("Payment · Payment succeeded")).toBeInTheDocument();
    expect(screen.queryByText(/refund/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/invoice|voucher|itinerary/i)).not.toBeInTheDocument();
  });

  it.each([
    ["REFUND_REQUESTED", "REFUND_PENDING", "Refund · Refund pending", "Refund completion is not yet available in this release."],
    ["REFUND_REQUESTED", "PENDING", "Refund · Refund requested", "Refund processing is pending."],
    ["REFUNDED", "REFUNDED", "Refund · Refunded", "show this booking as refunded"],
    ["CANCELLED", "FAILED", "Refund · Booking cancelled", "No refund applies"],
  ] as const)(
    "keeps refund state %s / %s honest without claiming unsupported completion",
    (status, paymentStatus, badge, copy) => {
      const { unmount } = render(
        <BookingCard booking={{ ...baseBooking, status, paymentStatus }} />,
      );

      expect(screen.getByText(badge)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))).toBeInTheDocument();
      if (status !== "REFUNDED") {
        expect(screen.queryByText("Refund · Refunded")).not.toBeInTheDocument();
      }
      unmount();
    },
  );

  it("points failed or pending payments back to the experience without promising support", () => {
    const { unmount } = render(
      <BookingCard booking={{ ...baseBooking, status: "CANCELLED", paymentStatus: "FAILED" }} />,
    );

    expect(screen.getAllByText(/not completed/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Return to this experience")).toBeInTheDocument();
    expect(screen.queryByText(/support team|contact us|itinerary download/i)).not.toBeInTheDocument();
    unmount();

    render(
      <BookingCard booking={{ ...baseBooking, status: "AWAITING_PAYMENT", paymentStatus: "PENDING" }} />,
    );
    expect(screen.getByText(/still being recorded/)).toBeInTheDocument();
  });

  it("shows destination, province, and a booking reference derived from the real booking id", () => {
    render(
      <BookingCard
        booking={{
          ...baseBooking,
          status: "CONFIRMED",
          paymentStatus: "SUCCEEDED",
          experience: {
            ...baseBooking.experience,
            destination: { name: "Greater Kruger", city: { province: { name: "Mpumalanga" } } },
          },
        }}
      />,
    );

    expect(screen.getByText("Greater Kruger · Mpumalanga")).toBeInTheDocument();
    expect(screen.getByText("Booking ref · BOOKING1")).toBeInTheDocument();
    expect(screen.getByTitle("booking-1")).toBeInTheDocument();
    expect(screen.queryByText("Destination not recorded for this booking.")).not.toBeInTheDocument();
  });

  it("shows a persisted partial refund amount separately from the booking total", () => {
    render(
      <BookingCard
        booking={{
          ...baseBooking,
          status: "CONFIRMED",
          paymentStatus: "PARTIALLY_REFUNDED",
          payments: [{ refundedAmount: "125.50" }],
        }}
      />,
    );

    expect(screen.getByText("Payment · Partially refunded")).toBeInTheDocument();
    expect(screen.getByText(/Refund recorded ·/)).toHaveTextContent("125,50");
    expect(screen.getByText(/1[\s\u00a0]300,00/)).toBeInTheDocument();
  });

  it("states honestly when no destination is recorded instead of inventing one", () => {
    render(<BookingCard booking={{ ...baseBooking, status: "CONFIRMED", paymentStatus: "SUCCEEDED" }} />);

    expect(screen.getByText("Destination not recorded for this booking.")).toBeInTheDocument();
    expect(screen.queryByText(/Cape Town|Durban|Johannesburg/i)).not.toBeInTheDocument();
  });

  it("uses host-facing copy in host tone", () => {
    render(
      <BookingCard tone="host" booking={{ ...baseBooking, status: "CONFIRMED", paymentStatus: "SUCCEEDED" }} />,
    );

    expect(screen.getByText("2 guests")).toBeInTheDocument();
    expect(screen.queryByText("2 travellers")).not.toBeInTheDocument();
    expect(screen.getByText("Booking total · ZAR")).toBeInTheDocument();
    expect(screen.queryByText("Total · ZAR")).not.toBeInTheDocument();
    expect(screen.getByText("Meeting point · Orpen Gate")).toBeInTheDocument();
  });

  it("states when the experience has no recorded meeting point", () => {
    render(
      <BookingCard
        tone="host"
        booking={{
          ...baseBooking,
          status: "CONFIRMED",
          paymentStatus: "SUCCEEDED",
          experience: { ...baseBooking.experience, meetingPoint: null },
        }}
      />,
    );

    expect(screen.getByText("Meeting point not listed for this experience.")).toBeInTheDocument();
  });

  it("keeps host-tone payment cues preparation-only with no traveller-facing link", () => {
    const { unmount } = render(
      <BookingCard tone="host" booking={{ ...baseBooking, status: "AWAITING_PAYMENT", paymentStatus: "FAILED" }} />,
    );

    expect(screen.getByText(/no preparation is needed unless the guest rebooks/i)).toBeInTheDocument();
    expect(screen.queryByText("Return to this experience")).not.toBeInTheDocument();
    expect(screen.queryByText(/support team|contact us|itinerary download|invoice|voucher/i)).not.toBeInTheDocument();
    unmount();

    render(
      <BookingCard tone="host" booking={{ ...baseBooking, status: "AWAITING_PAYMENT", paymentStatus: "PENDING" }} />,
    );
    expect(
      screen.getByText(/hold preparations until booking is confirmed and payment is successful/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Return to this experience")).not.toBeInTheDocument();
  });

  it("never claims refund completion in host tone unless the booking truly is refunded", () => {
    const { unmount } = render(
      <BookingCard
        tone="host"
        booking={{ ...baseBooking, status: "REFUND_REQUESTED", paymentStatus: "REFUND_PENDING" }}
      />,
    );

    expect(screen.getByText("Refund · Refund pending")).toBeInTheDocument();
    expect(screen.queryByText("Refund · Refunded")).not.toBeInTheDocument();
    expect(screen.queryByText(/support team|contact us|invoice|voucher|itinerary/i)).not.toBeInTheDocument();
    unmount();

    render(
      <BookingCard tone="host" booking={{ ...baseBooking, status: "REFUNDED", paymentStatus: "REFUNDED" }} />,
    );
    expect(screen.getByText("Refund · Refunded")).toBeInTheDocument();
    expect(screen.queryByText("Return to this experience")).not.toBeInTheDocument();
  });
});
