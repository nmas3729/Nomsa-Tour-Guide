import "server-only";

import { Prisma } from "@/src/server/db/generated/client";
import {
  BookingStatus,
  PaymentStatus,
  PayoutStatus,
  UserRole,
} from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";
import { getPayoutEnvironment } from "@/src/config/env";
import { getPrismaClient } from "@/src/server/db/prisma";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export class BookingFinancialError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 409,
  ) {
    super(message);
    this.name = "BookingFinancialError";
  }
}

function assertPrivileged(principal: AuthenticatedPrincipal, roles: UserRole[]) {
  if (!hasVerifiedAuthenticator(principal)) {
    throw new BookingFinancialError("Two-factor authentication is required for this action.", 403);
  }
  if (!roles.includes(principal.role)) {
    throw new BookingFinancialError("You are not allowed to perform this action.", 403);
  }
}

export function parsePlatformCommissionRate(value: string | undefined): Prisma.Decimal {
  if (!value) {
    throw new Error("NOMSA_PLATFORM_COMMISSION_RATE must be configured before creating a payout.");
  }
  if (!/^0\.\d{1,4}$/.test(value)) {
    throw new Error("NOMSA_PLATFORM_COMMISSION_RATE must be a decimal rate with at most four decimal places.");
  }
  const rate = new Prisma.Decimal(value);
  if (!rate.eq("0.20")) {
    throw new Error("NOMSA_PLATFORM_COMMISSION_RATE must be the approved 0.20 standard rate.");
  }
  return rate;
}

export function parsePayoutDisputeWindowDays(value: string | undefined): number {
  if (!value) {
    throw new Error("PAYOUT_DISPUTE_WINDOW_DAYS must be configured before creating a payout.");
  }
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error("PAYOUT_DISPUTE_WINDOW_DAYS must be a positive whole number of days.");
  }
  if (Number(value) !== 7) {
    throw new Error("PAYOUT_DISPUTE_WINDOW_DAYS must be the approved 7-day window.");
  }
  return 7;
}

function getPayoutPolicy() {
  const environment = getPayoutEnvironment();
  return {
    commissionRate: parsePlatformCommissionRate(environment.NOMSA_PLATFORM_COMMISSION_RATE),
    disputeWindowDays: parsePayoutDisputeWindowDays(environment.PAYOUT_DISPUTE_WINDOW_DAYS),
  };
}

function payoutEligibilityAt(serviceCompletedAt: Date, disputeWindowDays: number): Date {
  const eligibleAt = new Date(serviceCompletedAt.getTime() + disputeWindowDays * DAY_IN_MILLISECONDS);
  if (Number.isNaN(eligibleAt.getTime())) {
    throw new Error("PAYOUT_DISPUTE_WINDOW_DAYS exceeds the supported date range.");
  }
  return eligibleAt;
}

function payoutAmounts(
  amount: Prisma.Decimal,
  refundedAmount: Prisma.Decimal,
  commissionRate: Prisma.Decimal,
) {
  const grossAmount = amount.minus(refundedAmount);
  const commissionAmount = grossAmount
    .mul(commissionRate)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return {
    grossAmount,
    commissionAmount,
    amount: grossAmount.minus(commissionAmount),
  };
}

export function scheduledExperienceEnd(date: Date, timeSlot: string, durationMinutes: number): Date | null {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(timeSlot);
  if (!match) return null;
  const [, hourValue, minuteValue, meridiem] = match;
  const hour = Number(hourValue) % 12 + (meridiem === "PM" ? 12 : 0);
  const day = date.toISOString().slice(0, 10);
  const start = new Date(`${day}T${String(hour).padStart(2, "0")}:${minuteValue}:00+02:00`);
  return new Date(start.getTime() + durationMinutes * 60_000);
}

function writeAudit(
  transaction: Prisma.TransactionClient,
  principal: AuthenticatedPrincipal,
  action: string,
  entity: string,
  entityId: string,
  metadata: Prisma.InputJsonObject,
) {
  return transaction.auditLog.create({
    data: { userId: principal.id, action, entity, entityId, metadata },
  });
}

export async function markBookingCompleted(bookingId: string, principal: AuthenticatedPrincipal) {
  assertPrivileged(principal, [UserRole.GUIDE, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findUnique({
      where: { id: bookingId },
      include: {
        guide: { select: { userId: true } },
        experience: { select: { durationMinutes: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        payout: true,
      },
    });
    if (!booking) throw new BookingFinancialError("Booking not found.", 404);
    if (principal.role === UserRole.GUIDE && booking.guide.userId !== principal.id) {
      throw new BookingFinancialError("This booking is not assigned to your guide account.", 403);
    }

    let serviceCompletedAt = booking.serviceCompletedAt;
    if (booking.status !== BookingStatus.COMPLETED) {
      if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.CHECKED_IN) {
        throw new BookingFinancialError("Only confirmed or in-progress bookings can be completed.", 409);
      }
      const serviceEnd = scheduledExperienceEnd(
        booking.experienceDate,
        booking.timeSlot,
        booking.experience.durationMinutes,
      );
      if (!serviceEnd || serviceEnd > new Date()) {
        throw new BookingFinancialError("The scheduled experience must finish before it can be marked complete.", 409);
      }

      serviceCompletedAt = new Date();
      const updated = await transaction.booking.updateMany({
        where: {
          id: booking.id,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        },
        data: { status: BookingStatus.COMPLETED, serviceCompletedAt },
      });
      if (updated.count !== 1) {
        throw new BookingFinancialError("Booking status changed before completion could be recorded.", 409);
      }
      await writeAudit(transaction, principal, "booking.service_completed", "Booking", booking.id, {
        completedAt: serviceCompletedAt.toISOString(),
      });
    }

    const payment = booking.payments[0];
    if (
      !booking.payout &&
      serviceCompletedAt &&
      payment?.paidAt &&
      (payment.status === PaymentStatus.SUCCEEDED ||
        payment.status === PaymentStatus.PARTIALLY_REFUNDED ||
        payment.status === PaymentStatus.DISPUTED)
    ) {
      const payoutPolicy = getPayoutPolicy();
      const amounts = payoutAmounts(payment.amount, payment.refundedAmount, payoutPolicy.commissionRate);
      if (amounts.amount.gt(0)) {
        const payout = await transaction.payout.create({
          data: {
            bookingId: booking.id,
            guideId: booking.guideId,
            amount: amounts.amount,
            grossAmount: amounts.grossAmount,
            commissionAmount: amounts.commissionAmount,
            commissionRate: payoutPolicy.commissionRate,
            currency: payment.currency,
            status: PayoutStatus.PENDING,
            eligibleAt: payoutEligibilityAt(serviceCompletedAt, payoutPolicy.disputeWindowDays),
          },
        });
        await writeAudit(transaction, principal, "payout.created_pending", "Payout", payout.id, {
          bookingId: booking.id,
          amount: amounts.amount.toFixed(2),
          commissionAmount: amounts.commissionAmount.toFixed(2),
          commissionRate: payoutPolicy.commissionRate.toString(),
          disputeWindowDays: payoutPolicy.disputeWindowDays,
          eligibleAt: payoutEligibilityAt(serviceCompletedAt, payoutPolicy.disputeWindowDays).toISOString(),
        });
      }
    }

    return { status: BookingStatus.COMPLETED };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updatePaymentRecord(
  bookingId: string,
  status: PaymentStatus,
  refundedAmountText: string,
  principal: AuthenticatedPrincipal,
) {
  assertPrivileged(principal, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const refundedAmount = new Prisma.Decimal(refundedAmountText);
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findUnique({
      where: { id: bookingId },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 }, payout: true },
    });
    if (!booking) throw new BookingFinancialError("Booking not found.", 404);
    const payment = booking.payments[0];
    if (!payment) throw new BookingFinancialError("Booking has no payment record.", 409);
    if (payment.status === status && refundedAmount.eq(payment.refundedAmount)) {
      return { status, refundedAmount: refundedAmount.toFixed(2) };
    }
    if (payment.status === PaymentStatus.REFUNDED || booking.status === BookingStatus.REFUNDED) {
      throw new BookingFinancialError("A completed refund cannot be reversed through this control.", 409);
    }
    if (refundedAmount.lt(0) || refundedAmount.gt(payment.amount)) {
      throw new BookingFinancialError("Refund amount must be between zero and the recorded payment amount.", 400);
    }
    if (
      (status === PaymentStatus.PARTIALLY_REFUNDED ||
        status === PaymentStatus.REFUNDED ||
        status === PaymentStatus.DISPUTED ||
        status === PaymentStatus.REFUND_PENDING) &&
      !payment.paidAt
    ) {
      throw new BookingFinancialError("A payment must be recorded as received before it can be refunded or disputed.", 409);
    }
    if (
      payment.paidAt &&
      (status === PaymentStatus.PENDING ||
        status === PaymentStatus.PROCESSING ||
        status === PaymentStatus.FAILED ||
        status === PaymentStatus.CANCELLED)
    ) {
      throw new BookingFinancialError("A received payment cannot be changed back to an unpaid state.", 409);
    }
    if (status === PaymentStatus.PARTIALLY_REFUNDED && (!refundedAmount.gt(0) || !refundedAmount.lt(payment.amount))) {
      throw new BookingFinancialError("Partial refunds must be greater than zero and less than the full payment.", 400);
    }
    if (status === PaymentStatus.REFUNDED && !refundedAmount.eq(payment.amount)) {
      throw new BookingFinancialError("A completed refund must equal the full recorded payment amount.", 400);
    }
    if (
      status === PaymentStatus.SUCCEEDED &&
      (!payment.paidAt || !refundedAmount.eq(0))
    ) {
      throw new BookingFinancialError("Payment success cannot be manually created or overwrite a recorded refund.", 409);
    }
    if (
      booking.payout?.status === PayoutStatus.PAID &&
      !refundedAmount.eq(payment.refundedAmount)
    ) {
      throw new BookingFinancialError("A payout already released cannot be recalculated for a later refund.", 409);
    }
    await transaction.payment.update({
      where: { id: payment.id },
      data: { status, refundedAmount },
    });
    await transaction.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: status,
        ...(status === PaymentStatus.REFUNDED ? { status: BookingStatus.REFUNDED } : {}),
      },
    });

    if (booking.payout && booking.payout.status === PayoutStatus.PENDING) {
      if (!booking.payout.commissionRate) {
        throw new BookingFinancialError("Payout commission snapshot is missing; manual reconciliation is required.", 409);
      }
      const amounts = payoutAmounts(payment.amount, refundedAmount, booking.payout.commissionRate);
      if (amounts.amount.lte(0)) {
        await transaction.payout.update({
          where: { id: booking.payout.id },
          data: { status: PayoutStatus.CANCELLED },
        });
      } else {
        await transaction.payout.update({
          where: { id: booking.payout.id },
          data: {
            grossAmount: amounts.grossAmount,
            commissionAmount: amounts.commissionAmount,
            amount: amounts.amount,
          },
        });
      }
    }

    await writeAudit(transaction, principal, "payment.status_manually_updated", "Payment", payment.id, {
      bookingId,
      previousStatus: payment.status,
      status,
      previousRefundedAmount: payment.refundedAmount.toFixed(2),
      refundedAmount: refundedAmount.toFixed(2),
    });
    return { status, refundedAmount: refundedAmount.toFixed(2) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recordPayoutPaid(
  payoutId: string,
  eftReference: string,
  principal: AuthenticatedPrincipal,
) {
  assertPrivileged(principal, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    const payout = await transaction.payout.findUnique({
      where: { id: payoutId },
      include: {
        booking: {
          include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
        },
      },
    });
    if (!payout) throw new BookingFinancialError("Payout record not found.", 404);
    const releaseTime = new Date();
    const payment = payout.booking.payments[0];
    if (
      payout.status !== PayoutStatus.PENDING ||
      !payout.eligibleAt ||
      payout.eligibleAt > releaseTime ||
      payout.booking.status !== BookingStatus.COMPLETED ||
      !payout.booking.serviceCompletedAt
    ) {
      throw new BookingFinancialError("Payout is not eligible for release.", 409);
    }
    if (
      !payment?.paidAt ||
      (payment.status !== PaymentStatus.SUCCEEDED && payment.status !== PaymentStatus.PARTIALLY_REFUNDED)
    ) {
      throw new BookingFinancialError("Payout is blocked until payment is paid and not disputed or fully refunded.", 409);
    }
    if (!payout.commissionRate) {
      throw new BookingFinancialError("Payout commission snapshot is missing; manual reconciliation is required.", 409);
    }
    const amounts = payoutAmounts(payment.amount, payment.refundedAmount, payout.commissionRate);
    if (
      amounts.amount.lte(0) ||
      !payout.amount.eq(amounts.amount) ||
      !payout.grossAmount?.eq(amounts.grossAmount) ||
      !payout.commissionAmount?.eq(amounts.commissionAmount)
    ) {
      throw new BookingFinancialError("Payout amount does not match the current payment and refund records.", 409);
    }

    let updated;
    try {
      updated = await transaction.payout.updateMany({
        where: { id: payout.id, status: PayoutStatus.PENDING, eligibleAt: { lte: releaseTime } },
        data: {
          status: PayoutStatus.PAID,
          eftReference,
          paidAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BookingFinancialError("This transfer reference is already recorded.", 409);
      }
      throw error;
    }
    if (updated.count !== 1) {
      throw new BookingFinancialError("Payout status changed before release could be recorded.", 409);
    }
    await writeAudit(transaction, principal, "payout.manual_release_recorded", "Payout", payout.id, {
      bookingId: payout.bookingId,
      amount: payout.amount.toFixed(2),
      eftReference,
    });
    return { status: PayoutStatus.PAID };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
