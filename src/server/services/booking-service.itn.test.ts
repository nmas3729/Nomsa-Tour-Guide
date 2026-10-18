import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/src/server/db/generated/client";
import { hashPassword } from "@/src/features/auth/lib/password";
import { getServerEnvironment } from "@/src/config/env";
import { getPrismaClient } from "@/src/server/db/prisma";
import { createPayFastPaymentPayload, verifyPayFastITN } from "@/src/server/integrations/payfast";
import {
  createBooking,
  getBookingConfirmation,
  getPayFastCheckoutForBooking,
  processPayFastITN,
} from "./booking-service";

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
const hashPasswordMock = vi.mocked(hashPassword);
const createPaymentPayloadMock = vi.mocked(createPayFastPaymentPayload);

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
  user: { findUnique: ReturnType<typeof vi.fn> };
};
let transaction: {
  payment: {
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  booking: {
    updateMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  availability: {
    update: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  experience: { findFirst: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  environmentMock.mockReturnValue({
    PAYFAST_MERCHANT_ID: "merchant-test",
    NEXT_PUBLIC_APP_URL: "https://nomsa.test",
  } as ReturnType<typeof getServerEnvironment>);
  verifyITNMock.mockResolvedValue({ valid: true, reason: "" });
  hashPasswordMock.mockResolvedValue("hashed-password");
  createPaymentPayloadMock.mockReturnValue({
    processUrl: "https://payfast.test",
    fields: {},
  });

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
      findUnique: vi.fn(async () => null),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(async () => undefined),
      updateMany: vi.fn(async ({ data }: { data: Partial<PaymentRecord["booking"]> }) => {
        Object.assign(payment.booking, data);
        return { count: 1 };
      }),
    },
    availability: {
      update: vi.fn(async () => undefined),
      findUnique: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    user: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "customer-id", name: "Alex Traveller" })),
    },
    experience: { findFirst: vi.fn() },
  };

  client = {
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
    user: { findUnique: vi.fn(async () => null) },
  };
  prismaClientMock.mockReturnValue(client as never);
});

describe("instant booking price persistence", () => {
  it("persists only the published base price and records unavailable components without adding fees", async () => {
    const price = new Prisma.Decimal("650.00");
    const booking = {
      id: "booking-id",
      experienceDate: new Date("2027-01-12T00:00:00.000Z"),
      travellerCount: 4,
      adultsCount: 4,
      childrenCount: 0,
      timeSlot: "09:00 AM",
      totalPrice: new Prisma.Decimal("2600.00"),
      baseAmount: new Prisma.Decimal("2600.00"),
      optionalExtrasAmount: new Prisma.Decimal(0),
      transportAmount: new Prisma.Decimal(0),
      platformFeeAmount: new Prisma.Decimal(0),
      taxAmount: null,
      bookingType: "INSTANT",
      cancellationPolicySnapshot: "Cancel at least 48 hours before the tour.",
      currency: "ZAR",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      serviceCompletedAt: null,
      createdAt: new Date("2026-10-18T00:00:00.000Z"),
      experience: {
        title: "Bo-Kaap heritage walk",
        slug: "bo-kaap-local-walk",
        meetingPoint: "Cape Town",
        destination: {
          name: "Cape Town",
          city: { name: "Cape Town", province: { name: "Western Cape" } },
        },
      },
      guide: { user: { name: "Guide" } },
      guests: [{
        fullName: "Alex Traveller",
        email: "alex@example.com",
        phone: "+27661234567",
      }],
      payments: [{
        paymentReference: "NOM-REFERENCE",
        status: "PENDING",
        amount: new Prisma.Decimal("2600.00"),
        refundedAmount: new Prisma.Decimal(0),
        currency: "ZAR",
        paidAt: null,
        metadata: null,
      }],
    };
    transaction.experience.findFirst.mockResolvedValue({
      id: "experience-id",
      guideId: "guide-id",
      title: "Bo-Kaap heritage walk",
      slug: "bo-kaap-local-walk",
      price,
      currency: "ZAR",
      minGuests: 1,
      maxGuests: 10,
      cancellationPolicy: "Cancel at least 48 hours before the tour.",
    });
    transaction.availability.findUnique.mockResolvedValue({
      id: "availability-id",
      remainingCapacity: 10,
    });
    transaction.booking.findUniqueOrThrow.mockResolvedValue(booking);

    const futureDate = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    await createBooking({
      experienceSlug: "bo-kaap-local-walk",
      date: futureDate,
      timeSlot: "09:00 AM",
      adultsCount: 4,
      childrenCount: 0,
      leadTraveller: {
        firstName: "Alex",
        lastName: "Traveller",
        email: "alex@example.com",
        phone: "+27661234567",
        country: "South Africa",
      },
      emergencyContact: { name: "Sam Traveller", phone: "+27661234568" },
    }, "f7858c69-568b-4e5e-927f-e56280f7642c");

    const createdBooking = transaction.booking.create.mock.calls[0][0].data;
    expect(createdBooking.totalPrice.toString()).toBe("2600");
    expect(createdBooking.baseAmount.toString()).toBe("2600");
    expect(createdBooking.optionalExtrasAmount.toString()).toBe("0");
    expect(createdBooking.transportAmount.toString()).toBe("0");
    expect(createdBooking.platformFeeAmount.toString()).toBe("0");
    expect(createdBooking.taxAmount).toBeNull();
    expect(createdBooking.bookingType).toBe("INSTANT");
    expect(createdBooking.cancellationPolicySnapshot).toBe("Cancel at least 48 hours before the tour.");
    expect(createdBooking.payments.create.amount.toString()).toBe("2600");
    expect(transaction.availability.updateMany).toHaveBeenCalled();
  });

  it("enforces the experience's persisted group limits when creating an instant booking", async () => {
    transaction.experience.findFirst.mockResolvedValue({
      id: "experience-id",
      guideId: "guide-id",
      price: new Prisma.Decimal("650.00"),
      currency: "ZAR",
      minGuests: 2,
      maxGuests: 3,
    });

    await expect(createBooking({
      experienceSlug: "bo-kaap-local-walk",
      date: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
      timeSlot: "09:00 AM",
      adultsCount: 4,
      childrenCount: 0,
      leadTraveller: {
        firstName: "Alex",
        lastName: "Traveller",
        email: "alex@example.com",
        phone: "+27661234567",
        country: "South Africa",
      },
      emergencyContact: { name: "Sam Traveller", phone: "+27661234568" },
    }, "456f7554-96ee-4bd9-a27c-d34cc0da7c65")).rejects.toMatchObject({
      status: 409,
      message: "This experience accepts 2 to 3 travellers.",
    });
    expect(transaction.availability.updateMany).not.toHaveBeenCalled();
  });
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
  it("refuses checkout for an expired reservation even before the cleanup job runs", async () => {
    client.booking.findFirst.mockResolvedValue({
      id: "booking-id",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      reservationExpiresAt: new Date(Date.now() - 60_000),
      customRequestId: null,
    });

    await expect(getPayFastCheckoutForBooking("booking-id", "customer-id")).rejects.toMatchObject({
      status: 409,
      message: "This booking is not ready for payment.",
    });
    expect(createPaymentPayloadMock).not.toHaveBeenCalled();
  });
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
        where: {
          id: "booking-id",
          OR: [{ idempotencyKeyHash: expect.any(String) }],
        },
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
