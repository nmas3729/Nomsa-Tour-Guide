import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import type { BookingRecordSummary } from "@/src/server/services/booking-service";
import { BookingConfirmationView } from "./booking-confirmation-view";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: "a",
}));

const searchParamsMock = vi.mocked(useSearchParams);
const fetchMock = vi.fn();

function makeBooking(overrides: Partial<BookingRecordSummary> = {}): BookingRecordSummary {
  return {
    id: "booking-id",
    reference: "NOM-TEST-REFERENCE",
    experienceTitle: "A local's walk through Bo-Kaap",
    experienceSlug: "bo-kaap-local-walk",
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
  };
}

function setupSearchParams(bookingId: string | null = "booking-id") {
  const params = new URLSearchParams(bookingId ? `bookingId=${bookingId}` : "");
  searchParamsMock.mockReturnValue(params as ReturnType<typeof useSearchParams>);
}

function setupSuccessfulLookup(booking: BookingRecordSummary) {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ booking }),
  });
}

beforeEach(() => {
  setupSearchParams();
  vi.stubGlobal("fetch", fetchMock);
});

describe("BookingConfirmationView", () => {
  it("renders persisted experience and booking facts with separate booking/payment states", async () => {
    setupSuccessfulLookup(
      makeBooking({ status: "CONFIRMED", paymentStatus: "SUCCEEDED" }),
    );

    render(<BookingConfirmationView />);

    expect(await screen.findByRole("heading", { name: "Your experience is confirmed" })).toBeInTheDocument();
    expect(screen.getByText("NOM-TEST-REFERENCE")).toBeInTheDocument();
    expect(screen.getByText("A local's walk through Bo-Kaap")).toBeInTheDocument();
    expect(screen.getByText("Cape Town, Western Cape")).toBeInTheDocument();
    expect(screen.getByText("Thandi Mokoena")).toBeInTheDocument();
    expect(screen.getByText("12 Dec 2026")).toBeInTheDocument();
    expect(screen.getByText("2 travellers")).toBeInTheDocument();
    expect(screen.getByText("Booking: Booking confirmed")).toBeInTheDocument();
    expect(screen.getByText("Payment: Payment succeeded")).toBeInTheDocument();
  });

  it.each([
    ["PENDING", "PENDING", "Booking pending", "Payment pending", "Your booking has been created"],
    ["AWAITING_PAYMENT", "PENDING", "Awaiting payment", "Payment pending", "Your booking has been created"],
    ["AWAITING_PAYMENT", "PROCESSING", "Awaiting payment", "Payment processing", "Your booking has been created"],
  ] as const)("does not claim success for %s / %s state", async (status, paymentStatus, bookingState, paymentState, title) => {
    setupSuccessfulLookup(
      makeBooking({
        status,
        paymentStatus,
      }),
    );

    render(<BookingConfirmationView />);

    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getAllByText(bookingState).length).toBeGreaterThan(0);
    expect(screen.getAllByText(paymentState).length).toBeGreaterThan(0);
    expect(screen.queryByText("Your payment has been verified")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your experience is confirmed" })).not.toBeInTheDocument();
  });

  it.each([
    ["CANCELLED", "FAILED", "Payment was not completed"],
    ["CANCELLED", "CANCELLED", "Payment was cancelled"],
    ["REFUND_REQUESTED", "REFUND_PENDING", "Payment update"],
    ["REFUNDED", "REFUNDED", "Payment update"],
  ] as const)("shows %s / %s without implying successful payment", async (status, paymentStatus, title) => {
    setupSuccessfulLookup(makeBooking({ status, paymentStatus }));

    render(<BookingConfirmationView />);

    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getAllByText(bookingStateText(status)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(paymentStateText(paymentStatus)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Your experience is confirmed" })).not.toBeInTheDocument();
  });

  it("distinguishes a requested refund from a completed refund and does not offer payment retry", async () => {
    setupSuccessfulLookup(makeBooking({ status: "REFUND_REQUESTED", paymentStatus: "REFUND_PENDING" }));

    const { unmount } = render(<BookingConfirmationView />);

    expect(await screen.findByRole("heading", { name: "Payment update" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Refund status" })).toHaveTextContent("Refund pending");
    expect(screen.getByRole("region", { name: "Refund status" })).toHaveTextContent(
      "Refund completion is not yet available in this release.",
    );
    expect(screen.getAllByText("Refund pending").length).toBeGreaterThan(0);
    expect(screen.getByText(/refund pending/)).toBeInTheDocument();
    expect(screen.queryByText("Payment refunded")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Return to this experience" })).not.toBeInTheDocument();

    unmount();
    setupSuccessfulLookup(makeBooking({ status: "REFUNDED", paymentStatus: "REFUNDED" }));
    render(<BookingConfirmationView />);

    expect((await screen.findAllByText("Payment refunded")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Booking refunded").length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "Refund status" })).toHaveTextContent("Refunded");
    expect(screen.queryByRole("link", { name: "Return to this experience" })).not.toBeInTheDocument();
  });

  it("shows an explicit pending message for refund-requested bookings without claiming completion", async () => {
    setupSuccessfulLookup(makeBooking({ status: "REFUND_REQUESTED", paymentStatus: "PENDING" }));

    render(<BookingConfirmationView />);

    expect(await screen.findByRole("region", { name: "Refund status" })).toHaveTextContent("Refund requested");
    expect(screen.getByRole("region", { name: "Refund status" })).toHaveTextContent("Refund processing is pending.");
    expect(screen.queryByText("Payment refunded")).not.toBeInTheDocument();
    expect(screen.queryByText("Booking refunded")).not.toBeInTheDocument();
  });

  it("explains that failed payment after cancellation carries no refund", async () => {
    setupSuccessfulLookup(makeBooking({ status: "CANCELLED", paymentStatus: "FAILED" }));

    render(<BookingConfirmationView />);

    expect(await screen.findByRole("region", { name: "Refund status" })).toHaveTextContent("Booking cancelled");
    expect(screen.getByRole("region", { name: "Refund status" })).toHaveTextContent("No refund applies");
    expect(screen.queryByText("Payment refunded")).not.toBeInTheDocument();
    expect(screen.queryByText("Refund pending")).not.toBeInTheDocument();
  });

  it("keeps booking and payment states visibly distinct on refund-related bookings", async () => {
    setupSuccessfulLookup(makeBooking({ status: "REFUND_REQUESTED", paymentStatus: "REFUND_PENDING" }));

    render(<BookingConfirmationView />);

    await screen.findByRole("heading", { name: "Payment update" });
    expect(screen.getByText("Booking: Refund requested")).toBeInTheDocument();
    expect(screen.getByText("Payment: Refund pending")).toBeInTheDocument();
    expect(screen.getByText("Refund: Refund pending")).toBeInTheDocument();
  });

  it("states when booking facts are missing instead of fabricating values", async () => {
    setupSuccessfulLookup(
      makeBooking({
        reference: "",
        experienceTitle: "",
        destination: "",
        guideName: "",
        date: "",
        timeSlot: "",
        travellerCount: 0,
      }),
    );

    render(<BookingConfirmationView />);

    await screen.findByRole("heading", { name: "Your booking has been created" });
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.getByText("Experience details not available")).toBeInTheDocument();
    expect(screen.getByText("Destination and province not listed")).toBeInTheDocument();
    expect(screen.getAllByText("Not listed").length).toBeGreaterThan(0);
    expect(screen.getByText("Cancellation terms are not included in the booking details provided here.")).toBeInTheDocument();
  });

  it("does not offer a nonexistent PDF, invoice, voucher, or receipt", async () => {
    setupSuccessfulLookup(makeBooking({ status: "CONFIRMED", paymentStatus: "SUCCEEDED" }));

    render(<BookingConfirmationView />);

    await screen.findByRole("heading", { name: "Your experience is confirmed" });
    expect(screen.queryByRole("button", { name: /download|pdf|invoice|voucher|receipt/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/VAT receipt|travel voucher|generated and downloaded/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Cancellation terms are not included/)).toBeInTheDocument();
  });

  it("shows PDF availability and clearly reports failed email delivery for a paid booking", async () => {
    setupSuccessfulLookup(makeBooking({
      status: "CONFIRMED",
      paymentStatus: "SUCCEEDED",
      paidAt: "2026-10-17T08:12:00.000Z",
      invoiceEmailStatus: "FAILED",
    }));

    render(<BookingConfirmationView />);

    const invoice = await screen.findByRole("region", { name: "Invoice" });
    expect(invoice).toHaveTextContent("Invoice PDF available");
    expect(invoice).toHaveTextContent("Invoice email delivery failed. You can download the PDF here.");
    expect(screen.getByRole("link", { name: "Download PDF" })).toHaveAttribute(
      "href",
      "/api/bookings/booking-id/invoice",
    );
  });

  it("offers a return path after failed payment but not as a universal success claim", async () => {
    setupSuccessfulLookup(makeBooking({ status: "CANCELLED", paymentStatus: "FAILED" }));

    const { unmount } = render(<BookingConfirmationView />);

    expect(await screen.findByRole("link", { name: "Return to this experience" })).toHaveAttribute(
      "href",
      "/experiences/bo-kaap-local-walk/book",
    );

    unmount();
    setupSuccessfulLookup(makeBooking({ status: "CONFIRMED", paymentStatus: "SUCCEEDED" }));
    render(<BookingConfirmationView />);

    expect(await screen.findByRole("heading", { name: "Your experience is confirmed" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Return to this experience" })).not.toBeInTheDocument();
  });

  it("shows a calm unavailable state and a contact path when lookup returns not found", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    render(<BookingConfirmationView />);

    expect(await screen.findByRole("heading", { name: "Booking not available" })).toBeInTheDocument();
    expect(screen.getByText("This booking could not be found or is no longer available.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact Nomsa" })).toHaveAttribute("href", "/contact");
  });

  it("asks for a booking reference when the confirmation URL has none", async () => {
    setupSearchParams(null);

    render(<BookingConfirmationView />);

    expect(await screen.findByRole("heading", { name: "Booking not available" })).toBeInTheDocument();
    expect(screen.getByText("No booking reference was provided, so booking details cannot be displayed.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function bookingStateText(status: BookingRecordSummary["status"]): string {
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

function paymentStateText(status: BookingRecordSummary["paymentStatus"]): string {
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
