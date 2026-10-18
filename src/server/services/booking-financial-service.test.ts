import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/src/server/db/generated/client";
import {
  BookingStatus,
  PaymentStatus,
  PayoutStatus,
  UserRole,
} from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";
import { getPrismaClient } from "@/src/server/db/prisma";
import {
  BookingFinancialError,
  markBookingCompleted,
  recordPayoutPaid,
  updatePaymentRecord,
  parsePlatformCommissionRate,
  parsePayoutDisputeWindowDays,
} from "./booking-financial-service";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  hasMfa: vi.fn(),
  getPayoutEnvironment: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/server/db/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/src/features/auth/lib/privileged-mfa", () => ({
  hasVerifiedAuthenticator: mocks.hasMfa,
}));
vi.mock("@/src/config/env", () => ({
  getPayoutEnvironment: mocks.getPayoutEnvironment,
}));

const getPrismaMock = vi.mocked(getPrismaClient);
const mfaMock = vi.mocked(hasVerifiedAuthenticator);
const guide: AuthenticatedPrincipal = {
  id: "guide-user",
  email: "guide@example.com",
  name: "Guide",
  role: UserRole.GUIDE,
  sessionVersion: 1,
  mfaVerified: true,
};
const admin: AuthenticatedPrincipal = { ...guide, id: "admin-user", role: UserRole.ADMIN };

let db: {
  booking: { findUnique: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  payout: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  payment: { update: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

function useTransaction() {
  db = {
    booking: {
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
    },
    payout: {
      create: vi.fn().mockResolvedValue({ id: "payout-id" }),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn(),
    },
    payment: { update: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue(undefined) },
  };
  getPrismaMock.mockReturnValue({
    $transaction: vi.fn(async (callback: (transaction: typeof db) => unknown) => callback(db)),
  } as never);
  mfaMock.mockReturnValue(true);
}

function completedPayment(status: PaymentStatus = PaymentStatus.SUCCEEDED, refundedAmount = "0") {
  return {
    id: "payment-id",
    amount: new Prisma.Decimal("1000"),
    refundedAmount: new Prisma.Decimal(refundedAmount),
    currency: "ZAR",
    status,
    paidAt: new Date(Date.now() - 60_000),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPayoutEnvironment.mockReturnValue({
    NOMSA_PLATFORM_COMMISSION_RATE: "0.20",
    PAYOUT_DISPUTE_WINDOW_DAYS: "7",
  });
  useTransaction();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("booking completion and payout controls", () => {
  it("records service completion and snapshots the configured commission and dispute window", async () => {
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      guideId: "guide-profile",
      status: BookingStatus.CONFIRMED,
      serviceCompletedAt: null,
      experienceDate: new Date(Date.now() - 2 * 86_400_000),
      timeSlot: "09:00 AM",
      guide: { userId: guide.id },
      experience: { durationMinutes: 120 },
      payments: [completedPayment()],
      payout: null,
    });

    await markBookingCompleted("booking-id", guide);

    expect(db.booking.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: BookingStatus.COMPLETED, serviceCompletedAt: expect.any(Date) },
    }));
    const payout = db.payout.create.mock.calls[0][0].data;
    expect(payout.grossAmount.toString()).toBe("1000");
    expect(payout.commissionAmount.toString()).toBe("200");
    expect(payout.commissionRate.toString()).toBe("0.2");
    expect(payout.amount.toString()).toBe("800");
    expect(payout.status).toBe(PayoutStatus.PENDING);
    expect(payout.eligibleAt.getTime()).toBe(
      db.booking.updateMany.mock.calls[0][0].data.serviceCompletedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    expect(db.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it("does not complete a booking before its scheduled experience has finished", async () => {
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      status: BookingStatus.CONFIRMED,
      serviceCompletedAt: null,
      experienceDate: new Date(Date.now() + 86_400_000),
      timeSlot: "09:00 AM",
      guide: { userId: guide.id },
      experience: { durationMinutes: 120 },
      payments: [completedPayment()],
      payout: null,
    });

    await expect(markBookingCompleted("booking-id", guide)).rejects.toMatchObject({
      status: 409,
      message: "The scheduled experience must finish before it can be marked complete.",
    });
    expect(db.booking.updateMany).not.toHaveBeenCalled();
    expect(db.payout.create).not.toHaveBeenCalled();
  });

  it("does not let a guide complete another guide's booking", async () => {
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      guide: { userId: "different-guide" },
      experience: { durationMinutes: 120 },
      payments: [],
      payout: null,
    });

    await expect(markBookingCompleted("booking-id", guide)).rejects.toBeInstanceOf(BookingFinancialError);
    expect(db.booking.updateMany).not.toHaveBeenCalled();
  });

  it("recalculates a pending payout after an admin records a partial refund", async () => {
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      status: BookingStatus.COMPLETED,
      payments: [completedPayment()],
      payout: {
        id: "payout-id",
        status: PayoutStatus.PENDING,
        commissionRate: new Prisma.Decimal("0.20"),
      },
    });

    await updatePaymentRecord("booking-id", PaymentStatus.PARTIALLY_REFUNDED, "200.00", admin);

    expect(db.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: PaymentStatus.PARTIALLY_REFUNDED, refundedAmount: new Prisma.Decimal("200.00") },
    }));
    const payout = db.payout.update.mock.calls[0][0].data;
    expect(payout.grossAmount.toString()).toBe("800");
    expect(payout.commissionAmount.toString()).toBe("160");
    expect(payout.amount.toString()).toBe("640");
    expect(db.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
    }));
  });

  it("cancels an unreleased payout after a full refund and treats an identical refund retry as a no-op", async () => {
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      status: BookingStatus.COMPLETED,
      payments: [completedPayment()],
      payout: {
        id: "payout-id",
        status: PayoutStatus.PENDING,
        commissionRate: new Prisma.Decimal("0.20"),
      },
    });
    await updatePaymentRecord("booking-id", PaymentStatus.REFUNDED, "1000.00", admin);

    expect(db.payout.update).toHaveBeenCalledWith({
      where: { id: "payout-id" },
      data: { status: PayoutStatus.CANCELLED },
    });

    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      status: BookingStatus.REFUNDED,
      payments: [{
        ...completedPayment(PaymentStatus.REFUNDED, "1000.00"),
        refundedAmount: new Prisma.Decimal("1000.00"),
      }],
      payout: { id: "payout-id", status: PayoutStatus.CANCELLED },
    });
    db.payment.update.mockClear();
    await updatePaymentRecord("booking-id", PaymentStatus.REFUNDED, "1000.00", admin);
    expect(db.payment.update).not.toHaveBeenCalled();
  });

  it("does not duplicate a payout when completion is retried", async () => {
    mocks.getPayoutEnvironment.mockReturnValue({
      NOMSA_PLATFORM_COMMISSION_RATE: "0.20",
      PAYOUT_DISPUTE_WINDOW_DAYS: "7",
    });
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      guideId: "guide-profile",
      status: BookingStatus.COMPLETED,
      serviceCompletedAt: new Date("2026-10-16T10:00:00.000Z"),
      experienceDate: new Date("2026-10-16T00:00:00.000Z"),
      timeSlot: "09:00 AM",
      guide: { userId: guide.id },
      experience: { durationMinutes: 120 },
      payments: [completedPayment()],
      payout: {
        id: "existing-payout",
        status: PayoutStatus.PENDING,
        commissionRate: new Prisma.Decimal("0.20"),
        amount: new Prisma.Decimal("800"),
        eligibleAt: new Date("2026-10-18T10:00:00.000Z"),
      },
    });

    await markBookingCompleted("booking-id", guide);
    await markBookingCompleted("booking-id", guide);

    expect(db.payout.create).not.toHaveBeenCalled();
  });

  it("uses the persisted commission rate when a later rate change and refund update the payout", async () => {
    mocks.getPayoutEnvironment.mockReturnValue({
      NOMSA_PLATFORM_COMMISSION_RATE: "0.20",
      PAYOUT_DISPUTE_WINDOW_DAYS: "7",
    });
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      status: BookingStatus.COMPLETED,
      payments: [completedPayment()],
      payout: {
        id: "payout-id",
        status: PayoutStatus.PENDING,
        commissionRate: new Prisma.Decimal("0.15"),
      },
    });

    await updatePaymentRecord("booking-id", PaymentStatus.PARTIALLY_REFUNDED, "200.00", admin);

    const payout = db.payout.update.mock.calls[0][0].data;
    expect(payout.grossAmount.toString()).toBe("800");
    expect(payout.commissionAmount.toString()).toBe("120");
    expect(payout.amount.toString()).toBe("680");
  });

  it("rounds the configured commission to cents using half-up monetary rounding", async () => {
    mocks.getPayoutEnvironment.mockReturnValue({
      NOMSA_PLATFORM_COMMISSION_RATE: "0.20",
      PAYOUT_DISPUTE_WINDOW_DAYS: "7",
    });
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      guideId: "guide-profile",
      status: BookingStatus.CONFIRMED,
      serviceCompletedAt: null,
      experienceDate: new Date(Date.now() - 2 * 86_400_000),
      timeSlot: "09:00 AM",
      guide: { userId: guide.id },
      experience: { durationMinutes: 120 },
      payments: [completedPayment(PaymentStatus.SUCCEEDED, "0")],
      payout: null,
    });
    db.booking.findUnique.mockImplementationOnce(async () => {
      const payment = completedPayment();
      payment.amount = new Prisma.Decimal("100.03");
      return {
        id: "booking-id",
        guideId: "guide-profile",
        status: BookingStatus.CONFIRMED,
        serviceCompletedAt: null,
        experienceDate: new Date(Date.now() - 2 * 86_400_000),
        timeSlot: "09:00 AM",
        guide: { userId: guide.id },
        experience: { durationMinutes: 120 },
        payments: [payment],
        payout: null,
      };
    });

    await markBookingCompleted("booking-id", guide);

    const payout = db.payout.create.mock.calls[0][0].data;
    expect(payout.commissionAmount.toString()).toBe("20.01");
    expect(payout.amount.toString()).toBe("80.02");
  });

  it("fails payout creation when the owner-confirmed policy configuration is missing", async () => {
    mocks.getPayoutEnvironment.mockReturnValue({});
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      guideId: "guide-profile",
      status: BookingStatus.CONFIRMED,
      serviceCompletedAt: null,
      experienceDate: new Date(Date.now() - 2 * 86_400_000),
      timeSlot: "09:00 AM",
      guide: { userId: guide.id },
      experience: { durationMinutes: 120 },
      payments: [completedPayment()],
      payout: null,
    });

    await expect(markBookingCompleted("booking-id", guide)).rejects.toThrow(
      "NOMSA_PLATFORM_COMMISSION_RATE must be configured",
    );
    expect(db.payout.create).not.toHaveBeenCalled();
  });

  it("fails payout creation when only the dispute-window setting is missing", async () => {
    mocks.getPayoutEnvironment.mockReturnValue({
      NOMSA_PLATFORM_COMMISSION_RATE: "0.20",
      PAYOUT_DISPUTE_WINDOW_DAYS: undefined,
    });
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      guideId: "guide-profile",
      status: BookingStatus.CONFIRMED,
      serviceCompletedAt: null,
      experienceDate: new Date(Date.now() - 2 * 86_400_000),
      timeSlot: "09:00 AM",
      guide: { userId: guide.id },
      experience: { durationMinutes: 120 },
      payments: [completedPayment()],
      payout: null,
    });

    await expect(markBookingCompleted("booking-id", guide)).rejects.toThrow(
      "PAYOUT_DISPUTE_WINDOW_DAYS must be configured",
    );
    expect(db.payout.create).not.toHaveBeenCalled();
  });

  it("blocks payout release while the payment is disputed", async () => {
    db.payout.findUnique.mockResolvedValue({
      id: "payout-id",
      bookingId: "booking-id",
      amount: new Prisma.Decimal("800"),
      grossAmount: new Prisma.Decimal("1000"),
      commissionAmount: new Prisma.Decimal("200"),
      status: PayoutStatus.PENDING,
      eligibleAt: new Date(Date.now() - 60_000),
      booking: {
        status: BookingStatus.COMPLETED,
        serviceCompletedAt: new Date(Date.now() - 60_000),
        payments: [completedPayment(PaymentStatus.DISPUTED)],
      },
    });

    await expect(recordPayoutPaid("payout-id", "EFT-123", admin)).rejects.toMatchObject({
      status: 409,
      message: "Payout is blocked until payment is paid and not disputed or fully refunded.",
    });
    expect(db.payout.updateMany).not.toHaveBeenCalled();
  });

  it("blocks payout release until the booking is completed", async () => {
    db.payout.findUnique.mockResolvedValue({
      id: "payout-id",
      bookingId: "booking-id",
      amount: new Prisma.Decimal("800"),
      grossAmount: new Prisma.Decimal("1000"),
      commissionAmount: new Prisma.Decimal("200"),
      commissionRate: new Prisma.Decimal("0.20"),
      status: PayoutStatus.PENDING,
      eligibleAt: new Date(Date.now() - 60_000),
      booking: {
        status: BookingStatus.CONFIRMED,
        serviceCompletedAt: null,
        payments: [completedPayment()],
      },
    });

    await expect(recordPayoutPaid("payout-id", "EFT-INCOMPLETE", admin)).rejects.toMatchObject({ status: 409 });
    expect(db.payout.updateMany).not.toHaveBeenCalled();
  });

  it("does not create a payout for a cancelled booking", async () => {
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      guideId: "guide-profile",
      status: BookingStatus.CANCELLED,
      serviceCompletedAt: null,
      experienceDate: new Date(Date.now() - 2 * 86_400_000),
      timeSlot: "09:00 AM",
      guide: { userId: guide.id },
      experience: { durationMinutes: 120 },
      payments: [completedPayment()],
      payout: null,
    });

    await expect(markBookingCompleted("booking-id", guide)).rejects.toMatchObject({ status: 409 });
    expect(db.payout.create).not.toHaveBeenCalled();
  });

  it("records payout as paid only with an eligible undisputed completed service", async () => {
    db.payout.findUnique.mockResolvedValue({
      id: "payout-id",
      bookingId: "booking-id",
      amount: new Prisma.Decimal("800"),
      grossAmount: new Prisma.Decimal("1000"),
      commissionAmount: new Prisma.Decimal("200"),
      commissionRate: new Prisma.Decimal("0.20"),
      status: PayoutStatus.PENDING,
      eligibleAt: new Date(Date.now() - 60_000),
      booking: {
        status: BookingStatus.COMPLETED,
        serviceCompletedAt: new Date(Date.now() - 60_000),
        payments: [completedPayment()],
      },
    });

    await recordPayoutPaid("payout-id", "EFT-123", admin);

    expect(db.payout.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: PayoutStatus.PAID, eftReference: "EFT-123", paidAt: expect.any(Date) },
    }));
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "payout.manual_release_recorded" }),
    }));
  });

  it("holds a historical payout without commission snapshots for manual reconciliation", async () => {
    db.payout.findUnique.mockResolvedValue({
      id: "legacy-payout-id",
      bookingId: "booking-id",
      amount: new Prisma.Decimal("800"),
      grossAmount: null,
      commissionAmount: null,
      commissionRate: null,
      status: PayoutStatus.PENDING,
      eligibleAt: new Date(Date.now() - 60_000),
      booking: {
        status: BookingStatus.COMPLETED,
        serviceCompletedAt: new Date(Date.now() - 60_000),
        payments: [completedPayment()],
      },
    });

    await expect(recordPayoutPaid("legacy-payout-id", "EFT-LEGACY", admin)).rejects.toMatchObject({
      status: 409,
      message: "Payout commission snapshot is missing; manual reconciliation is required.",
    });
    expect(db.payout.updateMany).not.toHaveBeenCalled();
  });

  it("rejects payout release immediately before eligibility, allows the exact boundary, and allows after it", async () => {
    const boundary = new Date("2026-10-18T10:00:00.000Z");
    const payoutRecord = () => ({
      id: "payout-id",
      bookingId: "booking-id",
      amount: new Prisma.Decimal("800"),
      grossAmount: new Prisma.Decimal("1000"),
      commissionAmount: new Prisma.Decimal("200"),
      commissionRate: new Prisma.Decimal("0.20"),
      status: PayoutStatus.PENDING,
      eligibleAt: boundary,
      booking: {
        status: BookingStatus.COMPLETED,
        serviceCompletedAt: new Date(boundary.getTime() - 86_400_000),
        payments: [completedPayment()],
      },
    });

    vi.useFakeTimers();
    vi.setSystemTime(boundary.getTime() - 1);
    db.payout.findUnique.mockResolvedValueOnce(payoutRecord());
    await expect(recordPayoutPaid("payout-id", "EFT-BEFORE", admin)).rejects.toMatchObject({ status: 409 });
    expect(db.payout.updateMany).not.toHaveBeenCalled();

    vi.setSystemTime(boundary);
    db.payout.findUnique.mockResolvedValueOnce(payoutRecord());
    await recordPayoutPaid("payout-id", "EFT-AT", admin);

    vi.setSystemTime(boundary.getTime() + 1);
    db.payout.findUnique.mockResolvedValueOnce(payoutRecord());
    await recordPayoutPaid("payout-id", "EFT-AFTER", admin);
    expect(db.payout.updateMany).toHaveBeenCalledTimes(2);
  });

  it("rejects a duplicate or concurrent release when the pending-state compare-and-set loses", async () => {
    db.payout.findUnique.mockResolvedValue({
      id: "payout-id",
      bookingId: "booking-id",
      amount: new Prisma.Decimal("800"),
      grossAmount: new Prisma.Decimal("1000"),
      commissionAmount: new Prisma.Decimal("200"),
      commissionRate: new Prisma.Decimal("0.20"),
      status: PayoutStatus.PENDING,
      eligibleAt: new Date(Date.now() - 60_000),
      booking: {
        status: BookingStatus.COMPLETED,
        serviceCompletedAt: new Date(Date.now() - 60_000),
        payments: [completedPayment()],
      },
    });
    db.payout.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const attempts = await Promise.allSettled([
      recordPayoutPaid("payout-id", "EFT-RACE-1", admin),
      recordPayoutPaid("payout-id", "EFT-RACE-2", admin),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    expect(db.payout.updateMany).toHaveBeenCalledTimes(2);
  });

  it("does not change a paid payout when an admin attempts to add a later refund", async () => {
    db.booking.findUnique.mockResolvedValue({
      id: "booking-id",
      status: BookingStatus.COMPLETED,
      payments: [completedPayment()],
      payout: { id: "payout-id", status: PayoutStatus.PAID },
    });

    await expect(
      updatePaymentRecord("booking-id", PaymentStatus.PARTIALLY_REFUNDED, "100.00", admin),
    ).rejects.toMatchObject({ status: 409 });
    expect(db.payment.update).not.toHaveBeenCalled();
  });

  describe("payout policy configuration", () => {
    it("accepts the approved 20% commission", () => {
      const rate = "0.20";
      expect(parsePlatformCommissionRate(rate).eq(rate)).toBe(true);
    });

    it.each(["0.15", "0.175", "0.1499", "0.2001", "twenty", "0.2.0", undefined])(
      "rejects invalid commission configuration %s",
      (rate) => {
        expect(() => parsePlatformCommissionRate(rate)).toThrow();
      },
    );

    it("accepts only the approved seven-day dispute window", () => {
      expect(parsePayoutDisputeWindowDays("7")).toBe(7);
      expect(() => parsePayoutDisputeWindowDays(undefined)).toThrow();
      expect(() => parsePayoutDisputeWindowDays("0")).toThrow();
      expect(() => parsePayoutDisputeWindowDays("1.5")).toThrow();
      expect(() => parsePayoutDisputeWindowDays("1")).toThrow();
      expect(() => parsePayoutDisputeWindowDays("8")).toThrow();
    });
  });

  it("requires verified MFA before financial or completion actions", async () => {
    mfaMock.mockReturnValue(false);

    await expect(markBookingCompleted("booking-id", guide)).rejects.toMatchObject({ status: 403 });
    await expect(recordPayoutPaid("payout-id", "EFT-NO-MFA", admin)).rejects.toMatchObject({ status: 403 });
    expect(getPrismaMock).not.toHaveBeenCalled();
  });

  it("rejects payout release by non-administrators", async () => {
    await expect(recordPayoutPaid("payout-id", "EFT-GUIDE", guide)).rejects.toMatchObject({ status: 403 });
    expect(getPrismaMock).not.toHaveBeenCalled();
  });
});
