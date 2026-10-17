import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { GET } from "./route";
import { getBookingConfirmation } from "@/src/server/services/booking-service";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/src/server/services/booking-service", () => ({
  getBookingConfirmation: vi.fn(),
  processPayFastITN: vi.fn(),
}));

const cookiesMock = vi.mocked(cookies);
const getBookingConfirmationMock = vi.mocked(getBookingConfirmation);
const bookingId = "123e4567-e89b-42d3-a456-426614174000";

beforeEach(() => {
  cookiesMock.mockResolvedValue({
    get: () => ({ value: "booking-access-key" }),
  } as Awaited<ReturnType<typeof cookies>>);
});

describe("GET /api/bookings/[id]", () => {
  it("returns a booking summary with private no-store caching", async () => {
    const booking = { reference: "NOM-REFERENCE", status: "CONFIRMED", paymentStatus: "SUCCEEDED" };
    getBookingConfirmationMock.mockResolvedValue(booking as never);

    const response = await GET(new Request(`http://localhost/api/bookings/${bookingId}`), {
      params: Promise.resolve({ id: bookingId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ booking });
    expect(getBookingConfirmationMock).toHaveBeenCalledWith(bookingId, "booking-access-key");
  });

  it("returns 404 when the booking is missing or access has expired", async () => {
    getBookingConfirmationMock.mockResolvedValue(null);

    const response = await GET(new Request(`http://localhost/api/bookings/${bookingId}`), {
      params: Promise.resolve({ id: bookingId }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Booking not found or access has expired.",
    });
  });

  it("rejects invalid ids without querying the booking service", async () => {
    const response = await GET(new Request("http://localhost/api/bookings/not-a-uuid"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(response.status).toBe(404);
    expect(getBookingConfirmationMock).not.toHaveBeenCalled();
  });

  it("returns a service-unavailable response when lookup fails", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getBookingConfirmationMock.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(new Request(`http://localhost/api/bookings/${bookingId}`), {
      params: Promise.resolve({ id: bookingId }),
    });

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Booking details are temporarily unavailable.",
    });
    expect(errorLog).toHaveBeenCalledOnce();
  });
});
