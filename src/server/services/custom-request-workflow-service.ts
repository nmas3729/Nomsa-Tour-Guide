import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@/src/server/db/generated/client";
import {
  BookingStatus,
  CustomRequestStatus,
  ExperienceStatus,
  GuideApplicationStatus,
  PaymentStatus,
  UserRole,
} from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { customRequestOfferSnapshotSchema } from "@/src/features/booking/custom-request-schemas";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";
import { getServerEnvironment } from "@/src/config/env";
import { getPrismaClient } from "@/src/server/db/prisma";
import {
  BookingError,
  bookingInclude,
  getPayFastCheckoutForBooking,
} from "@/src/server/services/booking-service";

const OFFER_TIME_SLOTS = ["09:00 AM", "02:00 PM"] as const;
const BOOKING_RESERVATION_DURATION_MS = 30 * 60 * 1000;
export class CustomRequestWorkflowError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 409,
  ) {
    super(message);
    this.name = "CustomRequestWorkflowError";
  }
}

function assertAdmin(principal: AuthenticatedPrincipal) {
  if (principal.role !== UserRole.ADMIN && principal.role !== UserRole.SUPER_ADMIN) {
    throw new CustomRequestWorkflowError("Administrator access is required.", 403);
  }
  if (!hasVerifiedAuthenticator(principal)) {
    throw new CustomRequestWorkflowError("Two-factor authentication is required.", 403);
  }
}

function assertGuide(principal: AuthenticatedPrincipal) {
  if (principal.role !== UserRole.GUIDE) {
    throw new CustomRequestWorkflowError("Guide access is required.", 403);
  }
  if (!hasVerifiedAuthenticator(principal)) {
    throw new CustomRequestWorkflowError("Two-factor authentication is required.", 403);
  }
}

function assertCustomer(principal: AuthenticatedPrincipal) {
  if (principal.role !== UserRole.CUSTOMER) {
    throw new CustomRequestWorkflowError("Traveller access is required.", 403);
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function utcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function validateOfferDate(
  date: string,
  request: { travelStartDate: Date | null; travelEndDate: Date | null; flexibleDates: boolean },
) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  const today = new Date().toISOString().slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    utcDate(parsed) !== date ||
    date < today
  ) {
    throw new CustomRequestWorkflowError("Choose a valid future offer date.", 400);
  }
  if (
    !request.flexibleDates &&
    ((request.travelStartDate && date < utcDate(request.travelStartDate)) ||
      (request.travelEndDate && date > utcDate(request.travelEndDate)))
  ) {
    throw new CustomRequestWorkflowError("The offered date must fall within the traveller's requested dates.", 400);
  }
  return parsed;
}

export async function assignCustomRequest(
  principal: AuthenticatedPrincipal,
  requestId: string,
  guideProfileId: string,
) {
  assertAdmin(principal);
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    const [request, guide] = await Promise.all([
      transaction.customRequest.findUnique({
        where: { id: requestId },
        select: { id: true, status: true, customerId: true, assignedGuideId: true },
      }),
      transaction.guideProfile.findFirst({
        where: {
          id: guideProfileId,
          verificationStatus: GuideApplicationStatus.APPROVED,
          deletedAt: null,
          user: { is: { isActive: true, deletedAt: null } },
        },
        select: { id: true, userId: true },
      }),
    ]);
    if (!request) throw new CustomRequestWorkflowError("Custom request not found.", 404);
    if (!guide) throw new CustomRequestWorkflowError("Choose an active approved guide.", 400);
    if (
      request.status !== CustomRequestStatus.SUBMITTED &&
      request.status !== CustomRequestStatus.ASSIGNED
    ) {
      throw new CustomRequestWorkflowError("This request can no longer be assigned.", 409);
    }

    const updated = await transaction.customRequest.updateMany({
      where: {
        id: request.id,
        status: { in: [CustomRequestStatus.SUBMITTED, CustomRequestStatus.ASSIGNED] },
      },
      data: { assignedGuideId: guide.id, status: CustomRequestStatus.ASSIGNED },
    });
    if (updated.count !== 1) {
      throw new CustomRequestWorkflowError("The request changed while it was being assigned.", 409);
    }
    await transaction.notification.create({
      data: {
        userId: guide.userId,
        type: "REQUEST_UPDATE",
        title: "A custom itinerary request was assigned to you",
        body: "Review the traveller's dates, group size, interests, and requirements in your dashboard.",
        data: { customRequestId: request.id },
      },
    });
    await transaction.auditLog.create({
      data: {
        userId: principal.id,
        action: "custom_itinerary.request_assigned",
        entity: "CustomRequest",
        entityId: request.id,
        metadata: { guideProfileId: guide.id, previousGuideProfileId: request.assignedGuideId },
      },
    });
    return { id: request.id, assignedGuideId: guide.id, status: CustomRequestStatus.ASSIGNED };
  });
}

export async function submitCustomRequestOffer(
  principal: AuthenticatedPrincipal,
  requestId: string,
  offer: {
    experienceId: string;
    date: string;
    timeSlot: (typeof OFFER_TIME_SLOTS)[number];
    travellerCount: number;
    amount: string;
  },
) {
  assertGuide(principal);
  const prisma = getPrismaClient();
  const guide = await prisma.guideProfile.findFirst({
    where: {
      userId: principal.id,
      verificationStatus: GuideApplicationStatus.APPROVED,
      deletedAt: null,
      user: { is: { isActive: true, deletedAt: null } },
    },
    select: { id: true },
  });
  if (!guide) throw new CustomRequestWorkflowError("An approved guide profile is required.", 403);

  const result = await prisma.$transaction(async (transaction) => {
    const request = await transaction.customRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        assignedGuideId: true,
        customerId: true,
        travelStartDate: true,
        travelEndDate: true,
        flexibleDates: true,
      },
    });
    if (!request) throw new CustomRequestWorkflowError("Custom request not found.", 404);
    if (request.assignedGuideId !== guide.id) {
      throw new CustomRequestWorkflowError("Only the assigned guide can respond to this request.", 403);
    }
    if (
      request.status !== CustomRequestStatus.ASSIGNED &&
      request.status !== CustomRequestStatus.QUOTED
    ) {
      throw new CustomRequestWorkflowError("This request is no longer open for an offer.", 409);
    }
    if (!OFFER_TIME_SLOTS.includes(offer.timeSlot)) {
      throw new CustomRequestWorkflowError("Choose a supported offer time.", 400);
    }

    const experience = await transaction.experience.findFirst({
      where: {
        id: offer.experienceId,
        guideId: guide.id,
        status: ExperienceStatus.PUBLISHED,
        verificationStatus: GuideApplicationStatus.APPROVED,
        deletedAt: null,
        guide: {
          is: {
            verificationStatus: GuideApplicationStatus.APPROVED,
            deletedAt: null,
            user: { is: { isActive: true, deletedAt: null } },
          },
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        durationMinutes: true,
        price: true,
        currency: true,
        minGuests: true,
        maxGuests: true,
        meetingPoint: true,
        inclusions: true,
        exclusions: true,
        cancellationPolicy: true,
        destination: { select: { name: true } },
      },
    });
    if (!experience) {
      throw new CustomRequestWorkflowError("Choose one of your currently approved, bookable experiences.", 400);
    }
    if (offer.travellerCount < experience.minGuests || offer.travellerCount > experience.maxGuests) {
      throw new CustomRequestWorkflowError(
        `This experience accepts ${experience.minGuests} to ${experience.maxGuests} travellers.`,
        400,
      );
    }
    if (experience.currency !== "ZAR") {
      throw new CustomRequestWorkflowError("Only ZAR offers can currently use PayFast checkout.", 409);
    }
    const offeredDate = validateOfferDate(offer.date, request);
    const amount = new Prisma.Decimal(offer.amount);
    if (!amount.isPositive()) {
      throw new CustomRequestWorkflowError("The final offer amount must be greater than zero.", 400);
    }
    const availability =
      (await transaction.availability.findUnique({
        where: {
          experienceId_date_timeSlot: {
            experienceId: experience.id,
            date: offeredDate,
            timeSlot: offer.timeSlot,
          },
        },
      })) ??
      (await transaction.availability.findUnique({
        where: {
          experienceId_date_timeSlot: {
            experienceId: experience.id,
            date: offeredDate,
            timeSlot: "ALL_DAY",
          },
        },
      }));
    if (!availability || availability.remainingCapacity < offer.travellerCount) {
      throw new CustomRequestWorkflowError("The selected date and group size are not currently available.", 409);
    }

    const snapshot = {
      experienceTitle: experience.title,
      experienceSlug: experience.slug,
      description: experience.description,
      destination: experience.destination.name,
      durationMinutes: experience.durationMinutes,
      meetingPoint: experience.meetingPoint,
      inclusions: experience.inclusions,
      exclusions: experience.exclusions,
      cancellationPolicy: experience.cancellationPolicy,
      currency: experience.currency,
    } satisfies Prisma.InputJsonObject;
    const updated = await transaction.customRequest.updateMany({
      where: {
        id: request.id,
        assignedGuideId: guide.id,
        status: { in: [CustomRequestStatus.ASSIGNED, CustomRequestStatus.QUOTED] },
        acceptedAt: null,
      },
      data: {
        status: CustomRequestStatus.QUOTED,
        quotedAmount: amount,
        quotedCurrency: experience.currency,
        offeredExperienceId: experience.id,
        offeredDate,
        offeredTimeSlot: offer.timeSlot,
        offeredTravellerCount: offer.travellerCount,
        offerSnapshot: snapshot,
        offerVersion: { increment: 1 },
        offeredAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      throw new CustomRequestWorkflowError("The request changed while the offer was being saved.", 409);
    }
    await transaction.notification.create({
      data: {
        userId: request.customerId,
        type: "REQUEST_UPDATE",
        title: "A guide has sent a trip offer",
        body: "Review the proposed experience, date, group size, terms, and total price in your dashboard.",
        data: { customRequestId: request.id },
      },
    });
    await transaction.auditLog.create({
      data: {
        userId: principal.id,
        action: "custom_itinerary.offer_submitted",
        entity: "CustomRequest",
        entityId: request.id,
        metadata: {
          experienceId: experience.id,
          date: offer.date,
          timeSlot: offer.timeSlot,
          travellerCount: offer.travellerCount,
          currency: experience.currency,
        },
      },
    });
    return { id: request.id, status: CustomRequestStatus.QUOTED };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return result;
}

export async function declineCustomRequest(
  principal: AuthenticatedPrincipal,
  requestId: string,
  reason: string,
) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    const request = await transaction.customRequest.findUnique({
      where: { id: requestId },
      select: { id: true, customerId: true, assignedGuideId: true, status: true },
    });
    if (!request) throw new CustomRequestWorkflowError("Custom request not found.", 404);

    let notificationUserId: string;
    if (principal.role === UserRole.GUIDE) {
      assertGuide(principal);
      const guide = await transaction.guideProfile.findUnique({
        where: { userId: principal.id },
        select: { id: true },
      });
      if (!guide || request.assignedGuideId !== guide.id) {
        throw new CustomRequestWorkflowError("Only the assigned guide can decline this request.", 403);
      }
      if (
        request.status !== CustomRequestStatus.ASSIGNED &&
        request.status !== CustomRequestStatus.QUOTED
      ) {
        throw new CustomRequestWorkflowError("This request can no longer be declined.", 409);
      }
      notificationUserId = request.customerId;
    } else if (principal.role === UserRole.CUSTOMER) {
      assertCustomer(principal);
      if (request.customerId !== principal.id) {
        throw new CustomRequestWorkflowError("Custom request not found.", 404);
      }
      if (request.status !== CustomRequestStatus.QUOTED) {
        throw new CustomRequestWorkflowError("There is no open offer to decline.", 409);
      }
      notificationUserId = request.assignedGuideId
        ? (await transaction.guideProfile.findUnique({
            where: { id: request.assignedGuideId },
            select: { userId: true },
          }))?.userId ?? ""
        : "";
    } else {
      throw new CustomRequestWorkflowError("Only the assigned guide or requesting traveller can decline.", 403);
    }

    const updated = await transaction.customRequest.updateMany({
      where: {
        id: request.id,
        status: request.status,
        acceptedAt: null,
      },
      data: { status: CustomRequestStatus.REJECTED },
    });
    if (updated.count !== 1) {
      throw new CustomRequestWorkflowError("The request changed before this response was saved.", 409);
    }
    if (notificationUserId) {
      await transaction.notification.create({
        data: {
          userId: notificationUserId,
          type: "REQUEST_UPDATE",
          title: principal.role === UserRole.CUSTOMER ? "A trip offer was declined" : "A request was declined",
          body: reason || "The request status was updated.",
          data: { customRequestId: request.id },
        },
      });
    }
    await transaction.auditLog.create({
      data: {
        userId: principal.id,
        action: principal.role === UserRole.CUSTOMER
          ? "custom_itinerary.offer_declined"
          : "custom_itinerary.request_declined",
        entity: "CustomRequest",
        entityId: request.id,
        metadata: { reason },
      },
    });
    return { id: request.id, status: CustomRequestStatus.REJECTED };
  });
}

async function reserveOfferedAvailability(
  transaction: Prisma.TransactionClient,
  request: {
    offeredExperienceId: string;
    offeredDate: Date;
    offeredTimeSlot: string;
    offeredTravellerCount: number;
  },
) {
  const availability =
    (await transaction.availability.findUnique({
      where: {
        experienceId_date_timeSlot: {
          experienceId: request.offeredExperienceId,
          date: request.offeredDate,
          timeSlot: request.offeredTimeSlot,
        },
      },
    })) ??
    (await transaction.availability.findUnique({
      where: {
        experienceId_date_timeSlot: {
          experienceId: request.offeredExperienceId,
          date: request.offeredDate,
          timeSlot: "ALL_DAY",
        },
      },
    }));
  if (!availability) {
    throw new CustomRequestWorkflowError("The offered date is no longer available.", 409);
  }
  const reserved = await transaction.availability.updateMany({
    where: { id: availability.id, remainingCapacity: { gte: request.offeredTravellerCount } },
    data: { remainingCapacity: { decrement: request.offeredTravellerCount } },
  });
  if (reserved.count !== 1) {
    throw new CustomRequestWorkflowError("The offered group size is no longer available.", 409);
  }
  return availability.id;
}

export async function acceptCustomRequestOffer(
  principal: AuthenticatedPrincipal,
  requestId: string,
) {
  assertCustomer(principal);
  const env = getServerEnvironment();
  if (!env.NEXT_PUBLIC_APP_URL) {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured for booking checkout.");
  }
  const prisma = getPrismaClient();
  const bookingId = await prisma.$transaction(async (transaction) => {
    const request = await transaction.customRequest.findUnique({
      where: { id: requestId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        offeredExperience: {
          select: {
            id: true,
            guideId: true,
            slug: true,
            title: true,
            currency: true,
            status: true,
            verificationStatus: true,
            deletedAt: true,
            guide: {
              select: {
                userId: true,
                deletedAt: true,
                verificationStatus: true,
                user: { select: { isActive: true, deletedAt: true } },
              },
            },
          },
        },
        booking: {
          include: {
            payments: { select: { status: true } },
          },
        },
      },
    });
    if (!request || request.customerId !== principal.id) {
      throw new CustomRequestWorkflowError("Custom request not found.", 404);
    }
    if (
      request.status !== CustomRequestStatus.QUOTED &&
      request.status !== CustomRequestStatus.ACCEPTED
    ) {
      throw new CustomRequestWorkflowError("There is no open offer to accept.", 409);
    }
    if (
      !request.offeredExperienceId ||
      !request.offeredDate ||
      !request.offeredTimeSlot ||
      !request.offeredTravellerCount ||
      !request.quotedAmount ||
      !request.quotedCurrency ||
      !request.offerSnapshot ||
      !request.offeredExperience
    ) {
      throw new CustomRequestWorkflowError("The offer is incomplete and cannot be accepted.", 409);
    }
    const snapshotResult = customRequestOfferSnapshotSchema.safeParse(request.offerSnapshot);
    if (!snapshotResult.success) {
      throw new CustomRequestWorkflowError("The stored offer is invalid and cannot be accepted.", 409);
    }
    if (
      request.offeredExperience.status !== ExperienceStatus.PUBLISHED ||
      request.offeredExperience.verificationStatus !== GuideApplicationStatus.APPROVED ||
      request.offeredExperience.deletedAt ||
      request.offeredExperience.guide.deletedAt ||
      request.offeredExperience.guide.verificationStatus !== GuideApplicationStatus.APPROVED ||
      !request.offeredExperience.guide.user.isActive ||
      request.offeredExperience.guide.user.deletedAt ||
      request.offeredExperience.currency !== request.quotedCurrency ||
      request.offeredExperience.guideId !== request.assignedGuideId
    ) {
      throw new CustomRequestWorkflowError("The offered experience is no longer available.", 409);
    }
    if (request.booking) {
      const paymentIsActive =
        request.booking.status === BookingStatus.AWAITING_PAYMENT &&
        (request.booking.paymentStatus === PaymentStatus.PENDING ||
          request.booking.paymentStatus === PaymentStatus.PROCESSING);
      if (paymentIsActive) return request.booking.id;
      if (
        request.booking.status !== BookingStatus.CANCELLED ||
        (request.booking.paymentStatus !== PaymentStatus.CANCELLED &&
          request.booking.paymentStatus !== PaymentStatus.FAILED)
      ) {
        throw new CustomRequestWorkflowError("This request already has a booking in progress.", 409);
      }
      const availabilityId = await reserveOfferedAvailability(transaction, {
        offeredExperienceId: request.offeredExperienceId,
        offeredDate: request.offeredDate,
        offeredTimeSlot: request.offeredTimeSlot,
        offeredTravellerCount: request.offeredTravellerCount,
      });
      const reference = `NOM-${randomBytes(12).toString("hex").toUpperCase()}`;
      await transaction.booking.update({
        where: { id: request.booking.id },
        data: {
          availabilityId,
          status: BookingStatus.AWAITING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
          reservationExpiresAt: new Date(Date.now() + BOOKING_RESERVATION_DURATION_MS),
        },
      });
      await transaction.payment.create({
        data: {
          bookingId: request.booking.id,
          provider: "PAYFAST",
          paymentReference: reference,
          amount: request.booking.totalPrice,
          currency: request.booking.currency,
          status: PaymentStatus.PENDING,
          metadata: { customRequestId: request.id, offerVersion: request.offerVersion },
        },
      });
      return request.booking.id;
    }
    if (request.status !== CustomRequestStatus.QUOTED) {
      throw new CustomRequestWorkflowError("The offer cannot be converted into a booking.", 409);
    }

    const availabilityId = await reserveOfferedAvailability(transaction, {
      offeredExperienceId: request.offeredExperienceId,
      offeredDate: request.offeredDate,
      offeredTimeSlot: request.offeredTimeSlot,
      offeredTravellerCount: request.offeredTravellerCount,
    });
    const acceptedAt = new Date();
    const statusUpdated = await transaction.customRequest.updateMany({
      where: {
        id: request.id,
        customerId: principal.id,
        status: CustomRequestStatus.QUOTED,
        offerVersion: request.offerVersion,
        acceptedAt: null,
      },
      data: { status: CustomRequestStatus.ACCEPTED, acceptedAt },
    });
    if (statusUpdated.count !== 1) {
      throw new CustomRequestWorkflowError("The offer changed before it could be accepted.", 409);
    }

    const totalPrice = request.quotedAmount;
    const booking = await transaction.booking.create({
      data: {
        id: randomUUID(),
        idempotencyKeyHash: hash(randomUUID()),
        requestHash: hash(`${request.id}:${request.offerVersion}:${request.quotedAmount.toString()}`),
        customerId: request.customerId,
        guideId: request.offeredExperience.guideId,
        experienceId: request.offeredExperienceId,
        customRequestId: request.id,
        availabilityId,
        experienceDate: request.offeredDate,
        travellerCount: request.offeredTravellerCount,
        adultsCount: request.offeredTravellerCount,
        childrenCount: 0,
        timeSlot: request.offeredTimeSlot,
        totalPrice,
        baseAmount: totalPrice,
        optionalExtrasAmount: new Prisma.Decimal(0),
        transportAmount: new Prisma.Decimal(0),
        platformFeeAmount: new Prisma.Decimal(0),
        taxAmount: null,
        bookingType: "REQUEST_TO_BOOK",
        cancellationPolicySnapshot: snapshotResult.data.cancellationPolicy,
        agreedTermsSnapshot: request.offerSnapshot,
        currency: request.quotedCurrency,
        status: BookingStatus.AWAITING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        reservationExpiresAt: new Date(Date.now() + BOOKING_RESERVATION_DURATION_MS),
        guests: {
          create: {
            fullName: request.customer.name,
            email: request.customer.email,
            phone: request.customer.phone,
          },
        },
        payments: {
          create: {
            provider: "PAYFAST",
            paymentReference: `NOM-${randomBytes(12).toString("hex").toUpperCase()}`,
            amount: totalPrice,
            currency: request.quotedCurrency,
            status: PaymentStatus.PENDING,
            metadata: { customRequestId: request.id, offerVersion: request.offerVersion },
          },
        },
      },
      include: bookingInclude,
    });
    await transaction.notification.create({
      data: {
        userId: request.offeredExperience.guide.userId,
        type: "REQUEST_UPDATE",
        title: "A traveller accepted your itinerary offer",
        body: "Payment is now pending. The booking is not confirmed until PayFast reports successful payment.",
        data: { customRequestId: request.id, bookingId: booking.id },
      },
    });
    await transaction.auditLog.create({
      data: {
        userId: principal.id,
        action: "custom_itinerary.offer_accepted",
        entity: "CustomRequest",
        entityId: request.id,
        metadata: { offerVersion: request.offerVersion, bookingId: booking.id },
      },
    });
    return booking.id;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  try {
    return await getPayFastCheckoutForBooking(bookingId, principal.id);
  } catch (error) {
    if (error instanceof BookingError) {
      throw new CustomRequestWorkflowError(error.message, error.status);
    }
    throw error;
  }
}
