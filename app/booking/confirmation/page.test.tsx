import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BookingConfirmationPage, { metadata } from "./page";

vi.mock("@/src/components/marketing/public-layout", () => ({
  PublicLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/src/components/booking/booking-confirmation-view", () => ({
  BookingConfirmationView: () => <div>Booking confirmation content</div>,
}));

describe("/booking/confirmation page", () => {
  it("uses neutral booking-details metadata instead of claiming success before lookup", () => {
    expect(metadata).toMatchObject({
      title: "Booking Details",
      description: "Review your booking details and payment status.",
      robots: { index: false, follow: false },
    });
  });

  it("renders confirmation content within the public layout", () => {
    render(<BookingConfirmationPage />);

    expect(screen.getByRole("main")).toContainElement(screen.getByText("Booking confirmation content"));
  });
});
