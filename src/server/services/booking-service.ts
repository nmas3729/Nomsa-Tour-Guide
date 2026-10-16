import "server-only";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { hashPassword } from "@/src/features/auth/lib/password";
import { Prisma } from "@/src/server/db/generated/client";
import { BookingStatus, PaymentStatus } from "@/src/server/db/generated/enums";
import { createBookingSchema, type CreateBookingInput } from "@/src/features/booking/schemas";
import { getServerEnvironment } from "@/src/config/env";
import { getPrismaClient } from "@/src/server/db/prisma";
import {
  assertPayFastConfiguration,
  createPayFastPaymentPayload,
  verifyPayFastITN,
} from "@/src/server/integrations/payfast";

export interface BookingRecordSummary {
  id: string;
  reference: string;
  experienceTitle: string;
  experienceSlug: string;
  guideName: string;
  destination: string;
  date: string;
  timeSlot: string;
  travellerCount: number;
  adultsCount: number;
  childrenCount: number;
  leadEmail: string;
  leadName: string;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  meetingPoint: string;
  createdAt: string;
}

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

const BOOKING_RESERVATION_DURATION_MS = 30 * 60 * 1000;
const AVAILABILITY_CLEANUP_BATCH_SIZE = 100;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function cents(value: string | number): string | null {
  const normalized = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const [whole, fraction = ""] = normalized.split(".");
  return `${whole.replace(/^0+(?=\d)/, "")}.${fraction.padEnd(2, "0")}`;
}

function bookingSummary(booking: {
  id: string;
  experienceDate: Date;
  travellerCount: number;
  adultsCount: number;
  childrenCount: number;
  timeSlot: string;
  totalPrice: Prisma.Decimal;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  experience: {
    title: string;
    slug: string;
    meetingPoint: string | null;
    destination: {
      name: string;
      city: { name: string; province: { name: string } };
    };
  };
  guide: { user: { name: string } };
  guests: Array<{ fullName: string; email: string | null }>;
  payments: Array<{ paymentReference: string }>;
}): BookingRecordSummary {
  const lead = booking.guests[0];
  return {
    id: booking.id,
    reference: booking.payments[0]?.paymentReference ?? "",
    experienceTitle: booking.experience.title,
    experienceSlug: booking.experience.slug,
    guideName: booking.guide.user.name,
    destination: `${booking.experience.destination.name}, ${booking.experience.destination.city.province.name}`,
    date: booking.experienceDate.toISOString().slice(0, 10),
    timeSlot: booking.timeSlot,
    travellerCount: booking.travellerCount,
    adultsCount: booking.adultsCount,
    childrenCount: booking.childrenCount,
    leadEmail: lead?.email ?? "",
    leadName: lead?.fullName ?? "",
    totalPrice: Number(booking.totalPrice),
    currency: booking.currency,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    meetingPoint: booking.experience.meetingPoint ?? "Meeting point confirmed with host",
    createdAt: booking.createdAt.toISOString(),
  };
}

const bookingInclude = {
  experience: { include: { destination: { include: { city: { include: { province: true } } } } } },
  guide: { include: { user: true } },
  guests: true,
  payments: true,
} satisfies Prisma.BookingInclude;

function payFastPayloadFor(booking: {
  id: string;
  experienceDate: Date;
  timeSlot: string;
  travellerCount: number;
  totalPrice: Prisma.Decimal;
  guests: Array<{ fullName: string; email: string | null; phone: string | null }>;
  payments: Array<{ paymentReference: string }>;
  experience: { title: string; slug: string };
}, appUrl: string) {
  const lead = booking.guests[0];
  const [firstName = "Guest", ...lastNames] = (lead?.fullName ?? "Guest Traveller").split(" ");
  const date = booking.experienceDate.toISOString().slice(0, 10);

  return createPayFastPaymentPayload({
    paymentReference: booking.payments[0].paymentReference,
    amount: Number(booking.totalPrice),
    itemName: `Nomsa Tour: ${booking.experience.title.slice(0, 80)}`,
    itemDescription: `Date: ${date} (${booking.timeSlot}) for ${booking.travellerCount} guests`,
    firstName,
    lastName: lastNames.join(" ") || "Traveller",
    emailAddress: lead?.email ?? undefined,
    cellNumber: lead?.phone ?? undefined,
    returnUrl: `${appUrl}/booking/confirmation?bookingId=${booking.id}`,
    cancelUrl: `${appUrl}/experiences/${booking.experience.slug}/book?cancelled=true`,
    notifyUrl: `${appUrl}/api/payments/payfast/itn`,
  });
}

export async function createBooking(input: CreateBookingInput, idempotencyKey: string) {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    throw new BookingError("Booking details are invalid.", 400);
  }

  const values = parsed.data;
  const idempotencyKeyHash = hash(idempotencyKey);
  const requestHash = hash(JSON.stringify(values));
  const totalGuests = values.adultsCount + values.childrenCount;
  const bookingId = randomUUID();
  const bookingReference = `NOM-${randomBytes(12).toString("hex").toUpperCase()}`;
  const experienceDate = new Date(`${values.date}T00:00:00.000Z`);
  const reservationExpiresAt = new Date(Date.now() + BOOKING_RESERVATION_DURATION_MS);
  const env = getServerEnvironment();
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured for booking checkout.");
  }
  assertPayFastConfiguration();

  const prisma = getPrismaClient();
  const existingCustomer = await prisma.user.findUnique({
    where: { email: values.leadTraveller.email },
    select: { id: true },
  });
  const guestPasswordHash = existingCustomer
    ? null
    : await hashPassword(randomBytes(32).toString("base64url"));
  const booking = await prisma.$transaction(
    async (transaction) => {
      const existingBooking = await transaction.booking.findUnique({
        where: { idempotencyKeyHash },
        include: bookingInclude,
      });
      if (existingBooking) {
        if (!secureEqual(existingBooking.requestHash, requestHash)) {
          throw new BookingError("This idempotency key was already used for different booking details.", 409);
        }
        if (
          existingBooking.reservationExpiresAt &&
          existingBooking.reservationExpiresAt <= new Date()
        ) {
          throw new BookingError("This booking reservation has expired. Please start a new booking.", 409);
        }
        if (
          existingBooking.paymentStatus !== PaymentStatus.PENDING &&
          existingBooking.paymentStatus !== PaymentStatus.PROCESSING
        ) {
          throw new BookingError("This booking no longer has an active payment attempt.", 409);
        }
        return existingBooking;
      }

      const experience = await transaction.experience.findFirst({
        where: { slug: values.experienceSlug, status: "PUBLISHED", deletedAt: null },
      });
      if (!experience) {
        throw new BookingError("This experience is not available for booking.", 404);
      }
      if (experience.currency !== "ZAR") {
        throw new BookingError("This experience cannot currently be paid for in ZAR.", 409);
      }

      const availability =
        (await transaction.availability.findUnique({
          where: {
            experienceId_date_timeSlot: {
              experienceId: experience.id,
              date: experienceDate,
              timeSlot: values.timeSlot,
            },
          },
        })) ??
        (await transaction.availability.findUnique({
        where: {
          experienceId_date_timeSlot: {
            experienceId: experience.id,
            date: experienceDate,
            timeSlot: "ALL_DAY",
          },
        },
        }));
      if (!availability) {
        throw new BookingError("There is no availability for the selected date.", 409);
      }

      const reserved = await transaction.availability.updateMany({
        where: { id: availability.id, remainingCapacity: { gte: totalGuests } },
        data: { remainingCapacity: { decrement: totalGuests } },
      });
      if (reserved.count !== 1) {
        throw new BookingError("There is not enough capacity for this booking.", 409);
      }

      const normalizedEmail = values.leadTraveller.email;
      let customer = await transaction.user.findUnique({ where: { email: normalizedEmail } });
      if (!customer) {
        customer = await transaction.user.create({
          data: {
            email: normalizedEmail,
            name: `${values.leadTraveller.firstName} ${values.leadTraveller.lastName}`,
            passwordHash: guestPasswordHash ?? await hashPassword(randomBytes(32).toString("base64url")),
            phone: values.leadTraveller.phone,
            role: "CUSTOMER",
            isActive: false,
          },
        });
      }

      const totalPrice =
        Number(experience.price) * totalGuests +
        120 * totalGuests -
        (totalGuests >= 4 ? 250 : 0);
      await transaction.booking.create({
        data: {
          id: bookingId,
          idempotencyKeyHash,
          requestHash,
          customerId: customer.id,
          guideId: experience.guideId,
          experienceId: experience.id,
          availabilityId: availability.id,
          experienceDate,
          travellerCount: totalGuests,
          adultsCount: values.adultsCount,
          childrenCount: values.childrenCount,
          timeSlot: values.timeSlot,
          totalPrice,
          currency: experience.currency,
          status: BookingStatus.AWAITING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
          reservationExpiresAt,
          guests: {
            create: {
              fullName: `${values.leadTraveller.firstName} ${values.leadTraveller.lastName}`,
              email: normalizedEmail,
              phone: values.leadTraveller.phone,
            },
          },
          payments: {
            create: {
              provider: "PAYFAST",
              paymentReference: bookingReference,
              amount: totalPrice,
              currency: experience.currency,
              status: PaymentStatus.PENDING,
              metadata: {
                leadTravellerCountry: values.leadTraveller.country,
                emergencyContact: values.emergencyContact,
                dietary: values.dietary,
                accessibility: values.accessibility,
                specialRequests: values.specialRequests,
              },
            },
          },
        },
      });

      return transaction.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: bookingInclude,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  ).catch(async (error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.booking.findUnique({
        where: { idempotencyKeyHash },
        include: bookingInclude,
      });
      if (duplicate && secureEqual(duplicate.requestHash, requestHash)) {
        if (duplicate.reservationExpiresAt && duplicate.reservationExpiresAt <= new Date()) {
          throw new BookingError("This booking reservation has expired. Please start a new booking.", 409);
        }
        return duplicate;
      }
    }
    throw error;
  });

  return {
    booking: bookingSummary(booking),
    payfast: payFastPayloadFor(booking, appUrl),
  };
}

export async function cleanupExpiredBookingReservations(now = new Date()) {
  const prisma = getPrismaClient();
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.AWAITING_PAYMENT,
      paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      reservationExpiresAt: { lte: now },
    },
    select: { id: true, availabilityId: true, travellerCount: true },
    orderBy: { reservationExpiresAt: "asc" },
    take: AVAILABILITY_CLEANUP_BATCH_SIZE,
  });

  let expiredCount = 0;
  for (const booking of expiredBookings) {
    const released = await prisma.$transaction(
      async (transaction) => {
        const expired = await transaction.booking.updateMany({
          where: {
            id: booking.id,
            status: BookingStatus.AWAITING_PAYMENT,
            paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
            reservationExpiresAt: { lte: now },
          },
          data: {
            status: BookingStatus.CANCELLED,
            paymentStatus: PaymentStatus.CANCELLED,
            reservationExpiresAt: null,
          },
        });
        if (expired.count !== 1) {
          return false;
        }

        const cancelledPayment = await transaction.payment.updateMany({
          where: {
            bookingId: booking.id,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
          },
          data: { status: PaymentStatus.CANCELLED },
        });
        if (cancelledPayment.count !== 1) {
          throw new BookingError("Expired booking does not have exactly one active payment.", 409);
        }

        if (booking.availabilityId) {
          await transaction.availability.update({
            where: { id: booking.availabilityId },
            data: { remainingCapacity: { increment: booking.travellerCount } },
          });
        }

        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (released) {
      expiredCount += 1;
    }
  }

  const morePending = await prisma.booking.count({
    where: {
      status: BookingStatus.AWAITING_PAYMENT,
      paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      reservationExpiresAt: { lte: now },
    },
  });

  return { expiredCount, morePending: morePending > 0 };
}

export async function processPayFastITN(
  itnData: Record<string, string>,
  rawBody: string,
  sourceIp: string | null,
) {
  const verification = await verifyPayFastITN(itnData, rawBody, sourceIp);
  if (!verification.valid) {
    return { success: false as const, reason: verification.reason };
  }

  const env = getServerEnvironment();
  const paymentReference = itnData.m_payment_id;
  const providerTransactionId = itnData.pf_payment_id;
  const merchantId = itnData.merchant_id;
  const grossAmount = itnData.amount_gross;
  const currency = itnData.currency;
  const incomingStatus = itnData.payment_status;

  if (!paymentReference || !providerTransactionId || !merchantId || !grossAmount || !incomingStatus) {
    return { success: false as const, reason: "ITN is missing required payment fields." };
  }
  if (merchantId !== env.PAYFAST_MERCHANT_ID) {
    return { success: false as const, reason: "ITN merchant does not match this account." };
  }
  if (!["COMPLETE", "FAILED", "PENDING"].includes(incomingStatus)) {
    return { success: false as const, reason: "ITN payment status is not supported." };
  }

  const prisma = getPrismaClient();
  const result = await prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { paymentReference },
      include: { booking: true },
    });
    if (!payment) {
      return { success: false as const, reason: "ITN payment reference was not found." };
    }
    if (
      payment.currency !== "ZAR" ||
      cents(grossAmount) === null ||
      cents(grossAmount) !== cents(payment.amount.toFixed(2)) ||
      (currency !== undefined && currency !== payment.currency)
    ) {
      return { success: false as const, reason: "ITN amount or currency does not match the booking." };
    }

    const nextPaymentStatus =
      incomingStatus === "COMPLETE"
        ? PaymentStatus.SUCCEEDED
        : incomingStatus === "FAILED"
          ? PaymentStatus.FAILED
          : PaymentStatus.PROCESSING;
    if (payment.providerTransactionId && payment.providerTransactionId !== providerTransactionId) {
      return { success: false as const, reason: "Payment already has a different provider transaction." };
    }

    const now = new Date();
    const reservationExpired =
      payment.booking.reservationExpiresAt !== null &&
      payment.booking.reservationExpiresAt <= now;
    if (
      incomingStatus === "COMPLETE" &&
      (payment.booking.status === BookingStatus.CANCELLED || reservationExpired)
    ) {
      const latePayment = await transaction.payment.updateMany({
        where: {
          id: payment.id,
          providerTransactionId: payment.providerTransactionId,
          status: payment.status,
        },
        data: {
          providerTransactionId,
          status: PaymentStatus.REFUND_PENDING,
          paidAt: now,
        },
      });
      if (latePayment.count !== 1) {
        throw new BookingError("Late payment state changed while processing this ITN.", 409);
      }

      const cancelledReservation = payment.booking.status === BookingStatus.CANCELLED;
      const updatedBooking = await transaction.booking.updateMany({
        where: {
          id: payment.bookingId,
          status: payment.booking.status,
          paymentStatus: payment.booking.paymentStatus,
        },
        data: {
          status: BookingStatus.REFUND_REQUESTED,
          paymentStatus: PaymentStatus.REFUND_PENDING,
          reservationExpiresAt: null,
        },
      });
      if (updatedBooking.count !== 1) {
        throw new BookingError("Late payment booking state changed while processing this ITN.", 409);
      }

      if (!cancelledReservation && payment.booking.availabilityId) {
        await transaction.availability.update({
          where: { id: payment.booking.availabilityId },
          data: { remainingCapacity: { increment: payment.booking.travellerCount } },
        });
      }

      return { success: true as const, duplicate: false, latePayment: true };
    }

    if (payment.status === nextPaymentStatus) {
      return { success: true as const, duplicate: true };
    }
    if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PROCESSING) {
      return { success: true as const, duplicate: true };
    }

    const isComplete = nextPaymentStatus === PaymentStatus.SUCCEEDED;
    const isFailure = nextPaymentStatus === PaymentStatus.FAILED;

    const updated = await transaction.payment.updateMany({
      where: {
        id: payment.id,
        providerTransactionId: payment.providerTransactionId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      },
      data: {
        providerTransactionId,
        status: nextPaymentStatus,
        paidAt: isComplete ? now : null,
      },
    });
    if (updated.count !== 1) {
      throw new BookingError("Payment state changed while processing this ITN.", 409);
    }

    const updatedBooking = await transaction.booking.updateMany({
      where: {
        id: payment.bookingId,
        status: BookingStatus.AWAITING_PAYMENT,
        paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      },
      data: {
        paymentStatus: nextPaymentStatus,
        status: isComplete
          ? BookingStatus.CONFIRMED
          : isFailure
            ? BookingStatus.CANCELLED
            : BookingStatus.AWAITING_PAYMENT,
        reservationExpiresAt: isComplete || isFailure ? null : payment.booking.reservationExpiresAt,
      },
    });
    if (updatedBooking.count !== 1) {
      throw new BookingError("Booking state changed while processing this ITN.", 409);
    }

    if (isFailure && payment.booking.availabilityId) {
      await transaction.availability.update({
        where: { id: payment.booking.availabilityId },
        data: { remainingCapacity: { increment: payment.booking.travellerCount } },
      });
    }

    return { success: true as const, duplicate: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return result;
}

export async function getBookingConfirmation(
  bookingId: string,
  idempotencyKey: string | undefined,
): Promise<BookingRecordSummary | null> {
  if (!idempotencyKey) {
    return null;
  }
  const prisma = getPrismaClient();
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, idempotencyKeyHash: hash(idempotencyKey) },
    include: bookingInclude,
  });
  return booking ? bookingSummary(booking) : null;
}
