import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuideApplicationStatus, GuideDocumentType, UserRole } from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { getPrismaClient } from "@/src/server/db/prisma";
import { guideOnboardingSchema } from "@/src/features/auth/guide-onboarding-schema";
import { GuideOnboardingError, saveGuideOnboarding } from "./guide-onboarding-service";

const mocks = vi.hoisted(() => ({ hasMfa: vi.fn(), encryptText: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/src/server/db/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/src/features/auth/lib/privileged-mfa", () => ({
  hasVerifiedAuthenticator: mocks.hasMfa,
}));
vi.mock("@/src/server/services/guide-data-crypto", () => ({
  decryptGuideData: vi.fn(),
  encryptGuideData: vi.fn(),
  encryptGuideText: mocks.encryptText,
}));

const prismaMock = vi.mocked(getPrismaClient);
const guide: AuthenticatedPrincipal = {
  id: "guide-user",
  email: "guide@example.com",
  name: "Guide",
  role: UserRole.GUIDE,
  sessionVersion: 1,
  mfaVerified: true,
};

const completeValues = {
  phone: "+27123456789",
  biography: "A local guide with extensive knowledge of the region and its history.",
  yearsExperience: 5,
  languages: ["English"],
  operatingAreas: ["Western Cape"],
  qualifications: ["Registered guide"],
  specialties: ["History"],
  bankName: "Example Bank",
  bankAccountHolder: "Guide",
  bankAccountNumber: "1234567890",
  bankBranchCode: "123456",
  bankAccountType: "Cheque",
  permitsRequired: false,
  serviceTitle: "Local heritage walk",
  serviceDescription: "A guided walk exploring the local history, culture, and neighbourhood.",
  serviceCategoryId: "11111111-1111-4111-8111-111111111111",
  serviceDestinationId: "22222222-2222-4222-8222-222222222222",
  serviceCancellationPolicy: "Cancel at least 48 hours before the scheduled experience.",
  serviceDurationMinutes: 120,
  serviceMeetingPoint: "Visitor centre entrance",
  serviceMinGuests: 1,
  serviceMaxGuests: 8,
  serviceInclusions: ["Guide"],
  serviceExclusions: ["Transport"],
  servicePrice: "500.00",
};

let application: Record<string, unknown>;
type MockFunction = ReturnType<typeof vi.fn>;
type MockTransaction = {
  category: { findFirst: MockFunction };
  destination: { findFirst: MockFunction };
  guideApplication: { update: MockFunction };
  guideProfile: { update: MockFunction };
  experience: { findUnique: MockFunction; create: MockFunction; update: MockFunction };
  auditLog: { create: MockFunction };
};
let transaction: MockTransaction;

function setup() {
  application = {
    id: "application-id",
    status: GuideApplicationStatus.DRAFT,
    fullName: "Guide",
    phone: "",
    biography: "",
    yearsExperience: 0,
    languages: [],
    operatingAreas: [],
    qualifications: [],
    specialties: [],
    bankName: null,
    bankAccountHolder: null,
    bankBranchCode: null,
    bankAccountType: null,
    bankAccountNumberEncrypted: null,
    permitsRequired: false,
    serviceTitle: null,
    serviceDescription: null,
    serviceCategoryId: null,
    serviceDestinationId: null,
    serviceCancellationPolicy: null,
    proposedExperienceSlug: null,
    serviceDurationMinutes: null,
    serviceMeetingPoint: null,
    serviceMinGuests: null,
    serviceMaxGuests: null,
    serviceInclusions: [],
    serviceExclusions: [],
    servicePrice: null,
    serviceCurrency: null,
    adminNotes: null,
    documents: [],
  };
  transaction = {
    category: { findFirst: vi.fn().mockResolvedValue({ id: completeValues.serviceCategoryId }) },
    destination: { findFirst: vi.fn().mockResolvedValue({ id: completeValues.serviceDestinationId }) },
    guideApplication: {
      update: vi.fn(async ({ data }: { data: { status: GuideApplicationStatus } }) => ({
        id: application.id,
        status: data.status,
        fullName: "Guide",
        email: guide.email,
        phone: data.status,
      })),
    },
    guideProfile: { update: vi.fn().mockResolvedValue(undefined) },
    experience: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "experience-id" }),
      update: vi.fn().mockResolvedValue({ id: "experience-id" }),
    },
    auditLog: { create: vi.fn().mockResolvedValue(undefined) },
  };
  prismaMock.mockReturnValue({
    guideApplication: { findFirst: vi.fn().mockImplementation(() => Promise.resolve(application)) },
    guideProfile: {
      findUnique: vi.fn().mockResolvedValue({ id: "guide-profile", profilePhoto: "/guide.jpg" }),
    },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  } as never);
  mocks.hasMfa.mockReturnValue(true);
  mocks.encryptText.mockReturnValue("encrypted-account-number");
}

beforeEach(() => {
  vi.clearAllMocks();
  setup();
});

describe("guide onboarding service", () => {
  it("saves a private draft without creating an experience listing", async () => {
    const input = guideOnboardingSchema.parse({ ...completeValues, action: "save_draft" });

    const result = await saveGuideOnboarding(guide, input);

    expect(result.application.status).toBe(GuideApplicationStatus.DRAFT);
    expect(transaction.experience.create).not.toHaveBeenCalled();
    expect(transaction.guideProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { biography: completeValues.biography, yearsExperience: 5, specialties: ["History"], languages: ["English"], operatingAreas: ["Western Cape"], verificationStatus: GuideApplicationStatus.DRAFT },
    }));
  });

  it("rejects an incomplete submission before creating a listing", async () => {
    const input = guideOnboardingSchema.parse({ ...completeValues, action: "submit" });

    await expect(saveGuideOnboarding(guide, input)).rejects.toBeInstanceOf(GuideOnboardingError);
    expect(transaction.experience.create).not.toHaveBeenCalled();
    expect(transaction.guideApplication.update).not.toHaveBeenCalled();
  });

  it("creates a submitted, non-published experience only after all onboarding requirements are present", async () => {
    application.documents = [
      { documentType: GuideDocumentType.GOVERNMENT_ID },
      { documentType: GuideDocumentType.GUIDE_REGISTRATION },
      { documentType: GuideDocumentType.SUPPORTING_DOCUMENT },
    ];
    const input = guideOnboardingSchema.parse({ ...completeValues, action: "submit" });

    const result = await saveGuideOnboarding(guide, input);

    expect(result.application.status).toBe(GuideApplicationStatus.SUBMITTED);
    expect(transaction.experience.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guideId: "guide-profile",
        categoryId: completeValues.serviceCategoryId,
        destinationId: completeValues.serviceDestinationId,
        title: completeValues.serviceTitle,
        minGuests: 1,
        maxGuests: 8,
        cancellationPolicy: completeValues.serviceCancellationPolicy,
        status: "DRAFT",
        verificationStatus: GuideApplicationStatus.SUBMITTED,
      }),
    });
  });
});
