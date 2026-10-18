import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/src/server/db/generated/client";
import {
  GuideApplicationStatus,
  GuideDocumentType,
  UserRole,
} from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";
import type { GuideOnboardingInput } from "@/src/features/auth/guide-onboarding-schema";
import { getPrismaClient } from "@/src/server/db/prisma";
import {
  decryptGuideData,
  encryptGuideData,
  encryptGuideText,
} from "@/src/server/services/guide-data-crypto";

const mutableStatuses: GuideApplicationStatus[] = [
  GuideApplicationStatus.DRAFT,
  GuideApplicationStatus.PENDING,
  GuideApplicationStatus.CHANGES_REQUESTED,
];

export class GuideOnboardingError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 409,
  ) {
    super(message);
    this.name = "GuideOnboardingError";
  }
}

function assertGuide(principal: AuthenticatedPrincipal) {
  if (principal.role !== UserRole.GUIDE) {
    throw new GuideOnboardingError("Only guide accounts can manage guide onboarding.", 403);
  }
  if (!hasVerifiedAuthenticator(principal)) {
    throw new GuideOnboardingError("Two-factor authentication is required for this action.", 403);
  }
}

async function findApplication(applicantId: string) {
  return getPrismaClient().guideApplication.findFirst({
    where: { applicantId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      fullName: true,
      phone: true,
      biography: true,
      yearsExperience: true,
      languages: true,
      operatingAreas: true,
      qualifications: true,
      specialties: true,
      bankName: true,
      bankAccountHolder: true,
      bankBranchCode: true,
      bankAccountType: true,
      bankAccountNumberEncrypted: true,
      permitsRequired: true,
      serviceTitle: true,
      serviceDescription: true,
      serviceCategoryId: true,
      serviceDestinationId: true,
      serviceCancellationPolicy: true,
      proposedExperienceSlug: true,
      serviceDurationMinutes: true,
      serviceMeetingPoint: true,
      serviceMinGuests: true,
      serviceMaxGuests: true,
      serviceInclusions: true,
      serviceExclusions: true,
      servicePrice: true,
      serviceCurrency: true,
      adminNotes: true,
      documents: {
        select: {
          id: true,
          documentType: true,
          originalFilename: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getGuideOnboardingData(principal: AuthenticatedPrincipal) {
  assertGuide(principal);
  const prisma = getPrismaClient();
  const [application, guide, categories, destinations] = await Promise.all([
    findApplication(principal.id),
    prisma.guideProfile.findUnique({
      where: { userId: principal.id },
      select: { profilePhoto: true },
    }),
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.destination.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, city: { select: { province: { select: { name: true } } } } },
      orderBy: [{ city: { name: "asc" } }, { name: "asc" }],
    }),
  ]);
  if (!application || !guide) {
    throw new GuideOnboardingError("The guide onboarding record could not be found.", 404);
  }

  const proposedExperience = application.proposedExperienceSlug
    ? await prisma.experience.findUnique({
        where: { slug: application.proposedExperienceSlug },
        select: { status: true, verificationStatus: true },
      })
    : null;
  const { bankAccountNumberEncrypted, ...applicationData } = application;
  return {
    ...applicationData,
    servicePrice: application.servicePrice?.toString() ?? "",
    hasBankAccountNumber: Boolean(bankAccountNumberEncrypted),
    profilePhoto: guide.profilePhoto,
    proposedExperience,
    options: {
      categories,
      destinations: destinations.map(({ id, name, city }) => ({
        id,
        name,
        province: city.province.name,
      })),
    },
    documents: application.documents.map((document) => ({
      ...document,
      createdAt: document.createdAt.toISOString(),
    })),
  };
}

function missingSubmissionFields(
  input: GuideOnboardingInput,
  hasProfilePhoto: boolean,
  hasBankAccountNumber: boolean,
  documents: GuideDocumentType[],
): string[] {
  const missing: string[] = [];
  if (!hasProfilePhoto) missing.push("profile photo");
  if (input.biography.length < 40) missing.push("biography (at least 40 characters)");
  if (!input.languages.length) missing.push("at least one language");
  if (!input.operatingAreas.length) missing.push("at least one province served");
  if (!input.qualifications.length) missing.push("at least one qualification");
  if (!input.specialties.length) missing.push("at least one special interest");
  if (
    !input.bankName ||
    !input.bankAccountHolder ||
    !input.bankBranchCode ||
    !input.bankAccountType ||
    !hasBankAccountNumber
  ) {
    missing.push("complete banking details");
  }
  if (!documents.includes(GuideDocumentType.GOVERNMENT_ID)) missing.push("identity document");
  if (!documents.includes(GuideDocumentType.GUIDE_REGISTRATION)) missing.push("guide registration");
  if (!documents.includes(GuideDocumentType.SUPPORTING_DOCUMENT)) missing.push("supporting certificate");
  if (input.permitsRequired && !documents.includes(GuideDocumentType.PERMIT)) {
    missing.push("relevant permit");
  }
  if (input.serviceTitle.length < 3) missing.push("experience title");
  if (input.serviceDescription.length < 40) missing.push("experience description (at least 40 characters)");
  if (!input.serviceCategoryId) missing.push("experience category");
  if (!input.serviceDestinationId) missing.push("experience destination");
  if (input.serviceCancellationPolicy.length < 10) missing.push("cancellation policy");
  if (!input.serviceDurationMinutes) missing.push("experience duration");
  if (!input.serviceMeetingPoint) missing.push("meeting point");
  if (!input.serviceMinGuests || !input.serviceMaxGuests || input.serviceMaxGuests < input.serviceMinGuests) {
    missing.push("valid minimum and maximum group sizes");
  }
  if (!input.serviceInclusions.length) missing.push("experience inclusions");
  if (!input.serviceExclusions.length) missing.push("experience exclusions");
  if (!input.servicePrice || Number(input.servicePrice) <= 0) missing.push("experience price");
  return missing;
}

export async function saveGuideOnboarding(
  principal: AuthenticatedPrincipal,
  input: GuideOnboardingInput,
) {
  assertGuide(principal);
  const prisma = getPrismaClient();
  const application = await findApplication(principal.id);
  if (!application) throw new GuideOnboardingError("The guide onboarding record could not be found.", 404);
  if (!mutableStatuses.includes(application.status)) {
    throw new GuideOnboardingError(
      "This application is no longer editable. Contact the Nomsa team if it needs to be reopened.",
      409,
    );
  }

  const guide = await prisma.guideProfile.findUnique({
    where: { userId: principal.id },
    select: { id: true, profilePhoto: true },
  });
  if (!guide) throw new GuideOnboardingError("The guide profile could not be found.", 404);

  const encryptedBankNumber = input.bankAccountNumber
    ? encryptGuideText(input.bankAccountNumber)
    : application.bankAccountNumberEncrypted;
  const documentTypes = application.documents.map((document) => document.documentType);
  if (input.action === "submit") {
    const missing = missingSubmissionFields(
      input,
      Boolean(guide.profilePhoto),
      Boolean(encryptedBankNumber),
      documentTypes,
    );
    if (missing.length) {
      throw new GuideOnboardingError(
        `Complete these items before submitting: ${missing.join(", ")}.`,
        400,
      );
    }
  }

  const status =
    input.action === "submit"
      ? GuideApplicationStatus.SUBMITTED
      : application.status === GuideApplicationStatus.CHANGES_REQUESTED
        ? GuideApplicationStatus.CHANGES_REQUESTED
        : GuideApplicationStatus.DRAFT;
  const accountNumberEncrypted = encryptedBankNumber || null;
  const servicePrice =
    input.servicePrice && Number(input.servicePrice) > 0
      ? new Prisma.Decimal(input.servicePrice).toDecimalPlaces(2)
      : null;
  if (input.action === "submit" && !servicePrice) {
    throw new GuideOnboardingError("Enter a positive experience price before submitting.", 400);
  }
  const experienceSlug = application.proposedExperienceSlug ??
    `${input.serviceTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "guide-experience"}-${application.id.slice(0, 8)}`;

  const updated = await prisma.$transaction(async (transaction) => {
    if (input.serviceCategoryId) {
      const category = await transaction.category.findFirst({
        where: { id: input.serviceCategoryId, isActive: true, deletedAt: null },
        select: { id: true },
      });
      if (!category) throw new GuideOnboardingError("Choose an active experience category.", 400);
    }
    if (input.serviceDestinationId) {
      const destination = await transaction.destination.findFirst({
        where: { id: input.serviceDestinationId, deletedAt: null },
        select: { id: true },
      });
      if (!destination) throw new GuideOnboardingError("Choose an available destination.", 400);
    }

    const updatedApplication = await transaction.guideApplication.update({
      where: { id: application.id, applicantId: principal.id },
      data: {
        fullName: principal.name,
        phone: input.phone,
        biography: input.biography,
        yearsExperience: input.yearsExperience,
        languages: input.languages,
        operatingAreas: input.operatingAreas,
        qualifications: input.qualifications,
        specialties: input.specialties,
        bankName: input.bankName || null,
        bankAccountHolder: input.bankAccountHolder || null,
        bankBranchCode: input.bankBranchCode || null,
        bankAccountType: input.bankAccountType || null,
        bankAccountNumberEncrypted: accountNumberEncrypted,
        permitsRequired: input.permitsRequired,
        serviceTitle: input.serviceTitle || null,
        serviceDescription: input.serviceDescription || null,
        serviceCategoryId: input.serviceCategoryId || null,
        serviceDestinationId: input.serviceDestinationId || null,
        serviceCancellationPolicy: input.serviceCancellationPolicy || null,
        proposedExperienceSlug:
          input.action === "submit" || application.proposedExperienceSlug
            ? experienceSlug
            : undefined,
        serviceDurationMinutes: input.serviceDurationMinutes || null,
        serviceMeetingPoint: input.serviceMeetingPoint || null,
        serviceMinGuests: input.serviceMinGuests || null,
        serviceMaxGuests: input.serviceMaxGuests || null,
        serviceInclusions: input.serviceInclusions,
        serviceExclusions: input.serviceExclusions,
        servicePrice,
        serviceCurrency: servicePrice ? "ZAR" : null,
        status,
        submittedAt: input.action === "submit" ? new Date() : undefined,
      },
      select: { id: true, status: true, fullName: true, email: true, phone: true },
    });
    await transaction.guideProfile.update({
      where: { userId: principal.id },
      data: {
        biography: input.biography || null,
        yearsExperience: input.yearsExperience,
        specialties: input.specialties,
        languages: input.languages,
        operatingAreas: input.operatingAreas,
        verificationStatus: status,
      },
    });
    if (input.action === "submit") {
      const listing = {
        guideId: guide.id,
        categoryId: input.serviceCategoryId,
        destinationId: input.serviceDestinationId,
        title: input.serviceTitle,
        description: input.serviceDescription,
        durationMinutes: input.serviceDurationMinutes,
        price: new Prisma.Decimal(input.servicePrice).toDecimalPlaces(2),
        currency: "ZAR",
        minGuests: input.serviceMinGuests,
        maxGuests: input.serviceMaxGuests,
        meetingPoint: input.serviceMeetingPoint || null,
        inclusions: input.serviceInclusions,
        exclusions: input.serviceExclusions,
        cancellationPolicy: input.serviceCancellationPolicy,
        status: "DRAFT" as const,
        verificationStatus: GuideApplicationStatus.SUBMITTED,
      };
      const existingListing = await transaction.experience.findUnique({
        where: { slug: experienceSlug },
        select: { id: true, guideId: true },
      });
      if (existingListing && existingListing.guideId !== guide.id) {
        throw new GuideOnboardingError("The proposed experience slug is already in use.", 409);
      }
      if (existingListing) {
        await transaction.experience.update({
          where: { id: existingListing.id },
          data: listing,
        });
      } else {
        await transaction.experience.create({
          data: {
            ...listing,
            slug: experienceSlug,
          },
        });
      }
    }
    await transaction.auditLog.create({
      data: {
        userId: principal.id,
        action: input.action === "submit" ? "guide.onboarding.submitted" : "guide.onboarding.draft_saved",
        entity: "GuideApplication",
        entityId: application.id,
        metadata: { status },
      },
    });
    return updatedApplication;
  });

  return {
    application: updated,
    notification: input.action === "submit"
      ? {
          name: updated.fullName,
          email: updated.email,
          phone: updated.phone,
          applicationId: updated.id,
          serviceTitle: input.serviceTitle,
        }
      : null,
  };
}

export async function storeGuideDocument(
  principal: AuthenticatedPrincipal,
  input: {
    documentType: GuideDocumentType;
    originalFilename: string;
    mimeType: string;
    content: Buffer;
  },
) {
  assertGuide(principal);
  const application = await findApplication(principal.id);
  if (!application) throw new GuideOnboardingError("The guide onboarding record could not be found.", 404);
  if (!mutableStatuses.includes(application.status)) {
    throw new GuideOnboardingError("Documents cannot be changed while this application is under review.", 409);
  }

  const safeFilename = input.originalFilename
    .replace(/[\\/]/g, "_")
    .replace(/[^\w.\- ()]/g, "_")
    .slice(0, 180);
  const encrypted = encryptGuideData(input.content);
  const prisma = getPrismaClient();
  const document = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.guideApplicationDocument.create({
      data: {
        applicationId: application.id,
        documentType: input.documentType,
        storageKey: randomUUID(),
        originalFilename: safeFilename || "onboarding-document",
        mimeType: input.mimeType,
        sizeBytes: input.content.byteLength,
        encryptedContent: new Uint8Array(encrypted.encryptedContent),
        encryptionIv: new Uint8Array(encrypted.encryptionIv),
        encryptionTag: new Uint8Array(encrypted.encryptionTag),
      },
      select: {
        id: true,
        documentType: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });
    await transaction.auditLog.create({
      data: {
        userId: principal.id,
        action: "guide.document.uploaded",
        entity: "GuideApplicationDocument",
        entityId: saved.id,
        metadata: { documentType: input.documentType, sizeBytes: input.content.byteLength },
      },
    });
    return saved;
  });
  return { ...document, createdAt: document.createdAt.toISOString() };
}

export async function downloadGuideDocument(
  principal: AuthenticatedPrincipal,
  documentId: string,
) {
  if (
    principal.role !== UserRole.GUIDE &&
    principal.role !== UserRole.ADMIN &&
    principal.role !== UserRole.SUPER_ADMIN
  ) {
    throw new GuideOnboardingError("You are not allowed to access this document.", 403);
  }
  if (!hasVerifiedAuthenticator(principal)) {
    throw new GuideOnboardingError("Two-factor authentication is required to access this document.", 403);
  }
  const prisma = getPrismaClient();
  const document = await prisma.guideApplicationDocument.findFirst({
    where: {
      id: documentId,
      application: {
        applicantId: principal.id,
      },
    },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      encryptedContent: true,
      encryptionIv: true,
      encryptionTag: true,
      application: { select: { applicantId: true } },
    },
  });
  const isAdmin =
    principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN;
  const adminDocument = isAdmin
    ? await prisma.guideApplicationDocument.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          encryptedContent: true,
          encryptionIv: true,
          encryptionTag: true,
        },
      })
    : null;
  const record = document ?? adminDocument;
  if (!record) throw new GuideOnboardingError("Document not found.", 404);
  if (!record.encryptedContent || !record.encryptionIv || !record.encryptionTag) {
    throw new GuideOnboardingError("This legacy document has no stored file content.", 404);
  }
  const content = decryptGuideData(
    record.encryptedContent,
    record.encryptionIv,
    record.encryptionTag,
  );
  await prisma.auditLog.create({
    data: {
      userId: principal.id,
      action: "guide.document.downloaded",
      entity: "GuideApplicationDocument",
      entityId: record.id,
      metadata: { applicantId: document?.application.applicantId ?? "admin_access" },
    },
  });
  return {
    content,
    mimeType: record.mimeType,
    filename: record.originalFilename,
  };
}
