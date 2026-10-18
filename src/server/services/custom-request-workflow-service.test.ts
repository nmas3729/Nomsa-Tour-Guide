import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/src/server/db/generated/client";
import {
  CustomRequestStatus,
  ExperienceStatus,
  GuideApplicationStatus,
  UserRole,
} from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { getServerEnvironment } from "@/src/config/env";
import { getPrismaClient } from "@/src/server/db/prisma";
import { customRequestOfferSnapshotSchema } from "@/src/features/booking/custom-request-schemas";
import {
  acceptCustomRequestOffer,
  assignCustomRequest,
  CustomRequestWorkflowError,
  submitCustomRequestOffer,
} from "./custom-request-workflow-service";

const mocks = vi.hoisted(() => ({
  hasMfa: vi.fn(),
  findGuide: vi.fn(),
  findRequest: vi.fn(),
  findExperience: vi.fn(),
  findAvailability: vi.fn(),
  reserveAvailability: vi.fn(),
  updateRequest: vi.fn(),
  createBooking: vi.fn(),
  createNotification: vi.fn(),
  createAudit: vi.fn(),
  checkout: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/server/db/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/src/config/env", () => ({
  getServerEnvironment: vi.fn(() => ({ NEXT_PUBLIC_APP_URL: "https://nomsa.test" })),
}));
vi.mock("@/src/features/auth/lib/privileged-mfa", () => ({
  hasVerifiedAuthenticator: mocks.hasMfa,
}));
vi.mock("@/src/server/services/booking-service", () => ({
  BookingError: class BookingError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
  bookingInclude: {},
  getPayFastCheckoutForBooking: mocks.checkout,
}));

const prismaMock = vi.mocked(getPrismaClient);
const admin: AuthenticatedPrincipal = {
  id: "admin-id",
  email: "admin@example.com",
  name: "Admin",
  role: UserRole.ADMIN,
  sessionVersion: 1,
  mfaVerified: true,
};
const guide: AuthenticatedPrincipal = {
  id: "guide-user-id",
  email: "guide@example.com",
  name: "Guide",
  role: UserRole.GUIDE,
  sessionVersion: 1,
  mfaVerified: true,
};
const customer: AuthenticatedPrincipal = {
  id: "customer-id",
  email: "traveller@example.com",
  name: "Traveller",
  role: UserRole.CUSTOMER,
  sessionVersion: 1,
  mfaVerified: false,
};
const guideProfile = { id: "guide-profile-id", userId: guide.id };
const futureDate = new Date(Date.now() + 2 * 86_400_000);
futureDate.setUTCHours(0, 0, 0, 0);
const dateString = futureDate.toISOString().slice(0, 10);
const snapshot = {
  experienceTitle: "Heritage walk",
  experienceSlug: "heritage-walk",
  description: "A local guided walk through the neighbourhood.",
  destination: "Cape Town",
  durationMinutes: 120,
  meetingPoint: "Museum entrance",
  inclusions: ["Guide"],
  exclusions: ["Transport"],
  cancellationPolicy: "Cancel 48 hours before the experience.",
  currency: "ZAR",
};

function setup() {
  const transaction = {
    customRequest: {
      findUnique: mocks.findRequest,
      updateMany: mocks.updateRequest,
    },
    guideProfile: { findFirst: mocks.findGuide },
    experience: { findFirst: mocks.findExperience },
    availability: {
      findUnique: mocks.findAvailability,
      updateMany: mocks.reserveAvailability,
    },
    booking: { create: mocks.createBooking },
    notification: { create: mocks.createNotification },
    auditLog: { create: mocks.createAudit },
  };
  prismaMock.mockReturnValue({
    guideProfile: { findFirst: mocks.findGuide },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  } as never);
  mocks.hasMfa.mockReturnValue(true);
  mocks.findGuide.mockResolvedValue(guideProfile);
  mocks.findRequest.mockResolvedValue({
    id: "request-id",
    status: CustomRequestStatus.ASSIGNED,
    assignedGuideId: guideProfile.id,
    customerId: customer.id,
    travelStartDate: null,
    travelEndDate: null,
    flexibleDates: true,
  });
  mocks.findExperience.mockResolvedValue({
    id: "experience-id",
    title: snapshot.experienceTitle,
    slug: snapshot.experienceSlug,
    description: "A local guided walk through the neighbourhood.",
    durationMinutes: snapshot.durationMinutes,
    price: new Prisma.Decimal("900"),
    currency: "ZAR",
    minGuests: 1,
    maxGuests: 8,
    meetingPoint: snapshot.meetingPoint,
    inclusions: snapshot.inclusions,
    exclusions: snapshot.exclusions,
    cancellationPolicy: snapshot.cancellationPolicy,
    destination: { name: snapshot.destination },
  });
  mocks.findAvailability.mockResolvedValue({
    id: "availability-id",
    remainingCapacity: 8,
  });
  mocks.reserveAvailability.mockResolvedValue({ count: 1 });
  mocks.updateRequest.mockResolvedValue({ count: 1 });
  mocks.createBooking.mockResolvedValue({ id: "booking-id" });
  mocks.createNotification.mockResolvedValue(undefined);
  mocks.createAudit.mockResolvedValue(undefined);
  mocks.checkout.mockResolvedValue({
    booking: { id: "booking-id", paymentStatus: "PENDING" },
    payfast: { processUrl: "https://payfast.test", fields: {} },
  });
  vi.mocked(getServerEnvironment).mockReturnValue({
    NEXT_PUBLIC_APP_URL: "https://nomsa.test",
  } as ReturnType<typeof getServerEnvironment>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setup();
});

describe("custom itinerary workflow", () => {
  it("continues to read saved offer snapshots that predate description snapshots", () => {
    const legacySnapshot = Object.fromEntries(
      Object.entries(snapshot).filter(([key]) => key !== "description"),
    );

    expect(customRequestOfferSnapshotSchema.safeParse(legacySnapshot).success).toBe(true);
  });

  it("assigns only an active approved guide and records the assignment", async () => {
    const result = await assignCustomRequest(admin, "request-id", guideProfile.id);

    expect(result).toEqual({
      id: "request-id",
      assignedGuideId: guideProfile.id,
      status: CustomRequestStatus.ASSIGNED,
    });
    expect(mocks.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: guide.id }),
    }));
    expect(mocks.createAudit).toHaveBeenCalled();
  });

  it("allows only the assigned approved guide to submit a bookable experience offer", async () => {
    const result = await submitCustomRequestOffer(guide, "request-id", {
      experienceId: "experience-id",
      date: dateString,
      timeSlot: "09:00 AM",
      travellerCount: 3,
      amount: "1800.00",
    });

    expect(result).toEqual({ id: "request-id", status: CustomRequestStatus.QUOTED });
    expect(mocks.updateRequest).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        quotedAmount: expect.objectContaining({ toString: expect.any(Function) }),
        quotedCurrency: "ZAR",
        offeredDate: futureDate,
        offeredTravellerCount: 3,
        offerSnapshot: snapshot,
      }),
    }));
  });

  it("rejects offers from users without the guide role", async () => {
    await expect(
      submitCustomRequestOffer(customer, "request-id", {
        experienceId: "experience-id",
        date: dateString,
        timeSlot: "09:00 AM",
        travellerCount: 3,
        amount: "1800.00",
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.findExperience).not.toHaveBeenCalled();
  });

  it("requires explicit traveller acceptance before creating a pending PayFast booking", async () => {
    mocks.findRequest.mockResolvedValue({
      id: "request-id",
      customerId: customer.id,
      assignedGuideId: guideProfile.id,
      status: CustomRequestStatus.QUOTED,
      offeredExperienceId: "experience-id",
      offeredDate: futureDate,
      offeredTimeSlot: "09:00 AM",
      offeredTravellerCount: 3,
      quotedAmount: new Prisma.Decimal("1800.00"),
      quotedCurrency: "ZAR",
      offerSnapshot: snapshot,
      offerVersion: 1,
      booking: null,
      customer: { id: customer.id, name: "Traveller", email: customer.email, phone: null },
      offeredExperience: {
        id: "experience-id",
        guideId: guideProfile.id,
        slug: "heritage-walk",
        title: "Heritage walk",
        currency: "ZAR",
        status: ExperienceStatus.PUBLISHED,
        verificationStatus: GuideApplicationStatus.APPROVED,
        deletedAt: null,
        guide: {
          userId: guide.id,
          deletedAt: null,
          verificationStatus: GuideApplicationStatus.APPROVED,
          user: { isActive: true, deletedAt: null },
        },
      },
    });

    const result = await acceptCustomRequestOffer(customer, "request-id");

    expect(result).toMatchObject({ booking: { id: "booking-id" }, payfast: { processUrl: "https://payfast.test" } });
    expect(mocks.createBooking).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        customerId: customer.id,
        bookingType: "REQUEST_TO_BOOK",
        status: "AWAITING_PAYMENT",
        paymentStatus: "PENDING",
        totalPrice: expect.objectContaining({ toString: expect.any(Function) }),
        cancellationPolicySnapshot: snapshot.cancellationPolicy,
        agreedTermsSnapshot: snapshot,
      }),
    }));
    expect(mocks.checkout).toHaveBeenCalledWith("booking-id", customer.id);
  });

  it("does not create a booking for a non-owner accepting an offer", async () => {
    mocks.findRequest.mockResolvedValue({ id: "request-id", customerId: "another-customer" });

    await expect(acceptCustomRequestOffer(customer, "request-id")).rejects.toBeInstanceOf(
      CustomRequestWorkflowError,
    );
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });
});
