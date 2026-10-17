import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerEnvironment } from "@/src/config/env";
import { getPrismaClient } from "@/src/server/db/prisma";
import { verifyPayFastITN } from "@/src/server/integrations/payfast";
import { getBookingConfirmation, processPayFastITN } from "./booking-service";

vi.mock("server-only", () => ({}));
vi.mock("@/src/features/auth/lib/password", () => ({ hashPassword: vi.fn() }));
vi.mock("@/src/config/env", () => ({
  getServerEnvironment: vi.fn(() => ({ PAYFAST_MERCHANT_ID: "merchant-test" })),
}));
vi.mock("@/src/server/db/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/src/server/integrations/payfast", () => ({
  assertPayFastConfiguration: vi.fn(),
  createPayFastPaymentPayload: vi.fn(),
  verifyPayFastITN: vi.fn(),
}));

const environmentMock = vi.mocked(getServerEnvironment);
const prismaClientMock = vi.mocked(getPrismaClient);
const verifyITNMock = vi.mocked(verifyPayFastITN);

type PaymentRecord = {
  id: string;
  bookingId: string;
  providerTransactionId: string | null;
  status: string;
  amount: { toFixed: (digits: number) => string };
  currency: string;
  booking: {
    id: string;
    status: string;
    paymentStatus: string;
    reservationExpiresAt: Date | null;
    availabilityId: string | null;
    travellerCount: number;
  };
};

let payment: PaymentRecord;
let client: {
  $transaction: ReturnType<typeof vi.fn>;
  booking: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};
let transaction: {
  payment: {
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  booking: { updateMany: ReturnType<typeof vi.fn> };
  availability: { update: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  environmentMock.mockReturnValue({ PAYFAST_MERCHANT_ID: "merchant-test" } as ReturnType<typeof getServerEnvironment>);
  verifyITNMock.mockResolvedValue({ valid: true, reason: "" });

  payment = {
    id: "payment-id",
    bookingId: "booking-id",
    providerTransactionId: null,
    status: "PENDING",
    amount: { toFixed: () => "1200.00" },
    currency: "ZAR",
    booking: {
      id: "booking-id",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      reservationExpiresAt: new Date(Date.now() + 60_000),
      availabilityId: "availability-id",
      travellerCount: 2,
    },
  };

  transaction = {
    payment: {
      findUnique: vi.fn(async () => payment),
      updateMany: vi.fn(async ({ data }: { data: Partial<PaymentRecord> }) => {
        Object.assign(payment, data);
        return { count: 1 };
      }),
    },
    booking: {
      updateMany: vi.fn(async ({ data }: { data: Partial<PaymentRecord["booking"]> }) => {
        Object.assign(payment.booking, data);
        return { count: 1 };
      }),
    },
    availability: { update: vi.fn(async () => undefined) },
  };

  client = {
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
  };
  prismaClientMock.mockReturnValue(client as never);
});

function itn(paymentStatus: string) {
  return {
    m_payment_id: "NOM-REFERENCE",
    pf_payment_id: "payfast-transaction-id",
    merchant_id: "merchant-test",
    amount_gross: "1200.00",
    currency: "ZAR",
    payment_status: paymentStatus,
  };
}

describe("processPayFastITN booking/payment transitions", () => {
  it("changes an awaiting booking to confirmed only for a completed payment", async () => {
    const result = await processPayFastITN(itn("COMPLETE"), "complete", null);

    expect(result).toMatchObject({ success: true, duplicate: false });
    expect(payment.status).toBe("SUCCEEDED");
    expect(payment.booking.paymentStatus).toBe("SUCCEEDED");
    expect(payment.booking.status).toBe("CONFIRMED");
  });

  it("keeps the booking awaiting payment when PayFast reports pending", async () => {
    const result = await processPayFastITN(itn("PENDING"), "pending", null);

    expect(result).toMatchObject({ success: true, duplicate: false });
    expect(payment.status).toBe("PROCESSING");
    expect(payment.booking.paymentStatus).toBe("PROCESSING");
    expect(payment.booking.status).toBe("AWAITING_PAYMENT");
  });

  it("cancels the booking and releases capacity when PayFast reports failure", async () => {
    const result = await processPayFastITN(itn("FAILED"), "failed", null);

    expect(result).toMatchObject({ success: true, duplicate: false });
    expect(payment.status).toBe("FAILED");
    expect(payment.booking.paymentStatus).toBe("FAILED");
    expect(payment.booking.status).toBe("CANCELLED");
    expect(transaction.availability.update).toHaveBeenCalledWith({
      where: { id: "availability-id" },
      data: { remainingCapacity: { increment: 2 } },
    });
  });

  it("flags late payment on an expired reservation for refund instead of confirming it", async () => {
    payment.booking.reservationExpiresAt = new Date(Date.now() - 60_000);

    const result = await processPayFastITN(itn("COMPLETE"), "late-complete", null);

    expect(result).toMatchObject({ success: true, latePayment: true });
    expect(payment.status).toBe("REFUND_PENDING");
    expect(payment.booking.paymentStatus).toBe("REFUND_PENDING");
    expect(payment.booking.status).toBe("REFUND_REQUESTED");
    expect(transaction.availability.update).toHaveBeenCalledWith({
      where: { id: "availability-id" },
      data: { remainingCapacity: { increment: 2 } },
    });
  });

  it("flags a successful PayFast notification for an already-cancelled reservation as refund pending", async () => {
    payment.status = "CANCELLED";
    payment.booking.status = "CANCELLED";
    payment.booking.paymentStatus = "CANCELLED";
    payment.booking.reservationExpiresAt = null;

    const result = await processPayFastITN(itn("COMPLETE"), "late-after-cancel", null);

    expect(result).toMatchObject({ success: true, duplicate: false, latePayment: true });
    expect(payment.status).toBe("REFUND_PENDING");
    expect(payment.booking.status).toBe("REFUND_REQUESTED");
    expect(payment.booking.paymentStatus).toBe("REFUND_PENDING");
    expect(transaction.availability.update).not.toHaveBeenCalled();
  });

  it("does not turn an existing refund-pending state into a successful booking on duplicate ITN", async () => {
    payment.status = "REFUND_PENDING";
    payment.providerTransactionId = "payfast-transaction-id";
    payment.booking.status = "REFUND_REQUESTED";
    payment.booking.paymentStatus = "REFUND_PENDING";
    payment.booking.reservationExpiresAt = null;

    const result = await processPayFastITN(itn("COMPLETE"), "duplicate-refund", null);

    expect(result).toEqual({ success: true, duplicate: true });
    expect(payment.status).toBe("REFUND_PENDING");
    expect(payment.booking.status).toBe("REFUND_REQUESTED");
    expect(payment.booking.paymentStatus).toBe("REFUND_PENDING");
    expect(transaction.booking.updateMany).not.toHaveBeenCalled();
  });

  it("documents that no ITN path executes a refund to REFUNDED (pending is the terminal honest state)", async () => {
    // COMPLETE on an expired reservation is the only refund-writing path,
    // and it stops at REFUND_PENDING — nothing here calls a provider refund
    // or writes REFUNDED, so the UI must present pending as awaiting processing.
    payment.booking.reservationExpiresAt = new Date(Date.now() - 60_000);

    const result = await processPayFastITN(itn("COMPLETE"), "late-complete-doc", null);

    expect(result).toMatchObject({ success: true, latePayment: true });
    expect(payment.booking.status).not.toBe("REFUNDED");
    expect(payment.booking.paymentStatus).not.toBe("REFUNDED");
    expect(payment.booking.status).toBe("REFUND_REQUESTED");
    expect(payment.booking.paymentStatus).toBe("REFUND_PENDING");
  });

  it("expires an unpaid reservation, marks payment cancelled, and releases its capacity", async () => {
    client.booking.findMany.mockResolvedValue([
      { id: "booking-id", availabilityId: "availability-id", travellerCount: 2 },
    ]);

    const { cleanupExpiredBookingReservations } = await import("./booking-service");
    const result = await cleanupExpiredBookingReservations(new Date());

    expect(result).toEqual({ expiredCount: 1, morePending: false });
    expect(payment.booking.status).toBe("CANCELLED");
    expect(payment.booking.paymentStatus).toBe("CANCELLED");
    expect(payment.status).toBe("CANCELLED");
    expect(transaction.availability.update).toHaveBeenCalledWith({
      where: { id: "availability-id" },
      data: { remainingCapacity: { increment: 2 } },
    });
  });

  it("does not mutate booking or payment state when provider verification fails", async () => {
    verifyITNMock.mockResolvedValue({ valid: false, reason: "invalid signature" });
    const result = await processPayFastITN(itn("COMPLETE"), "invalid", null);

    expect(result).toEqual({ success: false, reason: "invalid signature" });
    expect(payment.status).toBe("PENDING");
    expect(payment.booking.status).toBe("AWAITING_PAYMENT");
    expect(transaction.payment.updateMany).not.toHaveBeenCalled();
    expect(transaction.booking.updateMany).not.toHaveBeenCalled();
  });

  it("does not treat a refund notification as a supported PayFast ITN transition", async () => {
    const result = await processPayFastITN(itn("REFUNDED"), "refund-notification", null);

    expect(result).toEqual({
      success: false,
      reason: "ITN payment status is not supported.",
    });
    expect(client.$transaction).not.toHaveBeenCalled();
    expect(transaction.payment.updateMany).not.toHaveBeenCalled();
  });

  it("returns null when the booking does not exist", async () => {
    client.booking.findFirst.mockResolvedValue(null);

    await expect(getBookingConfirmation("booking-id", "access-key")).resolves.toBeNull();
  });

  it("does not query the database when confirmation access is missing", async () => {
    await expect(getBookingConfirmation("booking-id", undefined)).resolves.toBeNull();
    expect(client.booking.findFirst).not.toHaveBeenCalled();
  });

  it("preserves distinct persisted booking and payment states in its summary", async () => {
    client.booking.findFirst.mockResolvedValue({
      id: "booking-id",
      experienceDate: new Date("2026-12-12T00:00:00.000Z"),
      travellerCount: 2,
      adultsCount: 2,
      childrenCount: 0,
      timeSlot: "09:00 AM",
      totalPrice: 1200,
      currency: "ZAR",
      status: "REFUNDED",
      paymentStatus: "REFUNDED",
      createdAt: new Date("2026-10-16T10:00:00.000Z"),
      experience: {
        title: "Bo-Kaap heritage walk",
        slug: "bo-kaap-heritage-walk",
        meetingPoint: null,
        destination: {
          name: "Cape Town",
          city: { name: "Cape Town", province: { name: "Western Cape" } },
        },
      },
      guide: { user: { name: "Thandi Mokoena" } },
      guests: [{ fullName: "Example Traveller", email: "traveller@example.com" }],
      payments: [{ paymentReference: "NOM-REFERENCE" }],
    } as never);

    const summary = await getBookingConfirmation("booking-id", "access-key");

    expect(summary).toMatchObject({
      reference: "NOM-REFERENCE",
      experienceTitle: "Bo-Kaap heritage walk",
      destination: "Cape Town, Western Cape",
      guideName: "Thandi Mokoena",
      date: "2026-12-12",
      travellerCount: 2,
      status: "REFUNDED",
      paymentStatus: "REFUNDED",
    });
    expect(client.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-id", idempotencyKeyHash: expect.any(String) },
      }),
    );
  });

  it.each([
    ["CANCELLED", "CANCELLED"],
    ["REFUND_REQUESTED", "REFUND_PENDING"],
    ["REFUNDED", "REFUNDED"],
  ] as const)("preserves cancellation/refund state %s / %s in lookup summary", async (status, paymentStatus) => {
    client.booking.findFirst.mockResolvedValue({
      id: "booking-id",
      experienceDate: new Date("2026-12-12T00:00:00.000Z"),
      travellerCount: 2,
      adultsCount: 2,
      childrenCount: 0,
      timeSlot: "09:00 AM",
      totalPrice: 1200,
      currency: "ZAR",
      status,
      paymentStatus,
      createdAt: new Date("2026-10-16T10:00:00.000Z"),
      experience: {
        title: "Bo-Kaap heritage walk",
        slug: "bo-kaap-heritage-walk",
        meetingPoint: null,
        destination: {
          name: "Cape Town",
          city: { name: "Cape Town", province: { name: "Western Cape" } },
        },
      },
      guide: { user: { name: "Thandi Mokoena" } },
      guests: [{ fullName: "Example Traveller", email: "traveller@example.com" }],
      payments: [{ paymentReference: "NOM-REFERENCE" }],
    } as never);

    await expect(getBookingConfirmation("booking-id", "access-key")).resolves.toMatchObject({
      status,
      paymentStatus,
    });
  });
});
