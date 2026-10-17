import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import type { BookingRecordSummary } from "@/src/server/services/booking-service";
import { getBookingConfirmation } from "@/src/server/services/booking-service";
import { GET } from "./route";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));
vi.mock("@/src/server/services/booking-service", () => ({
  getBookingConfirmation: vi.fn(),
}));

const bookingId = "e3b7f36e-e2d8-4859-aee0-4afc9216c46c";
const cookiesMock = vi.mocked(cookies);
const bookingMock = vi.mocked(getBookingConfirmation);
const paidBooking: BookingRecordSummary = {
  id: bookingId,
  reference: "NOM-ABC123",
  experienceTitle: "Bo-Kaap local walk",
  experienceSlug: "bo-kaap-local-walk",
  guideName: "Thandi Mokoena",
  destination: "Cape Town, Western Cape",
  date: "2026-12-12",
  timeSlot: "09:00 AM",
  travellerCount: 2,
  adultsCount: 2,
  childrenCount: 0,
  leadEmail: "alex@example.com",
  leadName: "Alex Traveller",
  totalPrice: 2400,
  currency: "ZAR",
  status: "CONFIRMED",
  paymentStatus: "SUCCEEDED",
  paidAt: "2026-10-17T08:12:00.000Z",
  invoiceEmailStatus: "SENT",
  meetingPoint: "Cape Town",
  createdAt: "2026-10-17T08:12:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({
    get: () => ({ value: "booking-access-key" }),
  } as never);
  bookingMock.mockResolvedValue(paidBooking);
});

describe("GET /api/bookings/[id]/invoice", () => {
  it("serves a PDF only with booking access and approved payment", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: bookingId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("invoice-NOM-ABC123.pdf");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);
    expect(bookingMock).toHaveBeenCalledWith(bookingId, "booking-access-key");
  });

  it("does not generate a PDF for an unpaid booking", async () => {
    bookingMock.mockResolvedValue({
      ...paidBooking,
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      paidAt: null,
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: bookingId }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "An invoice is available only for an approved payment.",
    });
  });

  it("does not reveal invoices without booking access", async () => {
    bookingMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: bookingId }),
    });

    expect(response.status).toBe(404);
  });
});
