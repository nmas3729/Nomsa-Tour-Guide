import "server-only";

import { GuideApplicationStatus, UserRole } from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";
import { getPrismaClient } from "@/src/server/db/prisma";
import { GuideOnboardingError } from "@/src/server/services/guide-onboarding-service";

export { GuideOnboardingError } from "@/src/server/services/guide-onboarding-service";

function assertReviewer(principal: AuthenticatedPrincipal) {
  if (principal.role !== UserRole.ADMIN && principal.role !== UserRole.SUPER_ADMIN) {
    throw new GuideOnboardingError("Administrator access is required.", 403);
  }
  if (!hasVerifiedAuthenticator(principal)) {
    throw new GuideOnboardingError("Two-factor authentication is required for this action.", 403);
  }
}

export async function getGuideReviewQueues(principal: AuthenticatedPrincipal) {
  assertReviewer(principal);
  const prisma = getPrismaClient();
  const [applications, experiences] = await Promise.all([
    prisma.guideApplication.findMany({
      where: {
        status: {
          in: [
            GuideApplicationStatus.SUBMITTED,
            GuideApplicationStatus.PENDING,
            GuideApplicationStatus.UNDER_REVIEW,
            GuideApplicationStatus.CHANGES_REQUESTED,
            GuideApplicationStatus.APPROVED,
            GuideApplicationStatus.SUSPENDED,
          ],
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        biography: true,
        yearsExperience: true,
        languages: true,
        operatingAreas: true,
        qualifications: true,
        specialties: true,
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
        submittedAt: true,
        applicant: {
          select: {
            guideProfile: { select: { profilePhoto: true } },
          },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            originalFilename: true,
            sizeBytes: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { submittedAt: "asc" },
      take: 50,
    }),
    prisma.experience.findMany({
      where: {
        verificationStatus: {
          in: [
            GuideApplicationStatus.DRAFT,
            GuideApplicationStatus.PENDING,
            GuideApplicationStatus.SUBMITTED,
            GuideApplicationStatus.CHANGES_REQUESTED,
            GuideApplicationStatus.APPROVED,
            GuideApplicationStatus.SUSPENDED,
          ],
        },
        status: { in: ["DRAFT", "PUBLISHED"] },
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        durationMinutes: true,
        meetingPoint: true,
        maxGuests: true,
        minGuests: true,
        inclusions: true,
        exclusions: true,
        cancellationPolicy: true,
        price: true,
        currency: true,
        status: true,
        verificationStatus: true,
        category: { select: { name: true } },
        destination: {
          select: { name: true, city: { select: { province: { select: { name: true } } } } },
        },
        guide: {
          select: { user: { select: { name: true, email: true } }, verificationStatus: true },
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 50,
    }),
  ]);

  return {
    applications: applications.map((application) => ({
      ...application,
      servicePrice: application.servicePrice?.toString() ?? null,
      submittedAt: application.submittedAt.toISOString(),
    })),
    experiences: experiences.map((experience) => ({
      ...experience,
      price: experience.price.toString(),
    })),
  };
}

export async function reviewGuideApplication(
  principal: AuthenticatedPrincipal,
  applicationId: string,
  status: GuideApplicationStatus,
  notes: string,
) {
  assertReviewer(principal);
  const allowed: GuideApplicationStatus[] = [
    GuideApplicationStatus.UNDER_REVIEW,
    GuideApplicationStatus.CHANGES_REQUESTED,
    GuideApplicationStatus.APPROVED,
    GuideApplicationStatus.SUSPENDED,
    GuideApplicationStatus.REJECTED,
  ];
  if (!allowed.includes(status)) {
    throw new GuideOnboardingError("That review status is not allowed.", 400);
  }
  if (
    ([GuideApplicationStatus.CHANGES_REQUESTED, GuideApplicationStatus.REJECTED, GuideApplicationStatus.SUSPENDED] as GuideApplicationStatus[])
      .includes(status) &&
    notes.trim().length < 5
  ) {
    throw new GuideOnboardingError("Add a brief note explaining this review decision.", 400);
  }

  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    const application = await transaction.guideApplication.findUnique({
      where: { id: applicationId },
      include: {
        documents: { select: { documentType: true } },
        applicant: { select: { guideProfile: { select: { id: true, profilePhoto: true } } } },
      },
    });
    if (!application) throw new GuideOnboardingError("Guide application not found.", 404);
    if (
      application.status === GuideApplicationStatus.APPROVED &&
      status !== GuideApplicationStatus.SUSPENDED
    ) {
      throw new GuideOnboardingError("This application is no longer in the review queue.", 409);
    }
    if (
      application.status === GuideApplicationStatus.SUSPENDED &&
      status !== GuideApplicationStatus.APPROVED &&
      status !== GuideApplicationStatus.CHANGES_REQUESTED
    ) {
      throw new GuideOnboardingError("A suspended application can only be reinstated or returned for changes.", 409);
    }
    const approvableStatuses: GuideApplicationStatus[] = [
      GuideApplicationStatus.SUBMITTED,
      GuideApplicationStatus.PENDING,
      GuideApplicationStatus.UNDER_REVIEW,
      GuideApplicationStatus.SUSPENDED,
    ];
    if (status === GuideApplicationStatus.APPROVED && !approvableStatuses.includes(application.status)) {
      throw new GuideOnboardingError("Only submitted applications can be approved.", 409);
    }
    if (status === GuideApplicationStatus.APPROVED) {
      const documents = new Set(application.documents.map((document) => document.documentType));
      const ready =
        application.applicant.guideProfile?.profilePhoto &&
        application.biography.trim().length >= 40 &&
        application.languages.length > 0 &&
        application.operatingAreas.length > 0 &&
        application.qualifications.length > 0 &&
        application.specialties.length > 0 &&
        application.bankName &&
        application.bankAccountHolder &&
        application.bankBranchCode &&
        application.bankAccountType &&
        application.bankAccountNumberEncrypted &&
        documents.has("GOVERNMENT_ID") &&
        documents.has("GUIDE_REGISTRATION") &&
        documents.has("SUPPORTING_DOCUMENT") &&
        (!application.permitsRequired || documents.has("PERMIT")) &&
        application.serviceTitle &&
        Boolean(application.serviceDescription && application.serviceDescription.trim().length >= 40) &&
        application.serviceCategoryId &&
        application.serviceDestinationId &&
        Boolean(application.serviceCancellationPolicy && application.serviceCancellationPolicy.trim().length >= 10) &&
        application.serviceDurationMinutes &&
        application.serviceMeetingPoint &&
        application.serviceMinGuests &&
        application.serviceMaxGuests &&
        application.serviceMaxGuests <= 10 &&
        application.serviceMaxGuests >= application.serviceMinGuests &&
        application.serviceInclusions.length > 0 &&
        application.serviceExclusions.length > 0 &&
        application.servicePrice?.gt(0);
      if (!ready) {
        throw new GuideOnboardingError(
          "The guide cannot be approved until all onboarding details and required documents are complete.",
          409,
        );
      }
    }

    await transaction.guideApplication.update({
      where: { id: application.id },
      data: {
        status,
        reviewedById: principal.id,
        adminNotes: notes.trim() || null,
        approvedAt: status === GuideApplicationStatus.APPROVED ? new Date() : null,
      },
    });
    if (application.applicant.guideProfile) {
      await transaction.guideProfile.update({
        where: { id: application.applicant.guideProfile.id },
        data: { verificationStatus: status },
      });
    }
    await transaction.auditLog.create({
      data: {
        userId: principal.id,
        action: "guide.application.reviewed",
        entity: "GuideApplication",
        entityId: application.id,
        metadata: { status, notes: notes.trim() },
      },
    });
    return { id: application.id, status };
  });
}

export async function reviewExperience(
  principal: AuthenticatedPrincipal,
  experienceId: string,
  status: GuideApplicationStatus,
  notes: string,
) {
  assertReviewer(principal);
  const allowed: GuideApplicationStatus[] = [
    GuideApplicationStatus.DRAFT,
    GuideApplicationStatus.SUBMITTED,
    GuideApplicationStatus.CHANGES_REQUESTED,
    GuideApplicationStatus.APPROVED,
    GuideApplicationStatus.SUSPENDED,
    GuideApplicationStatus.REJECTED,
  ];
  if (!allowed.includes(status)) {
    throw new GuideOnboardingError("That experience review status is not allowed.", 400);
  }
  if (
    ([GuideApplicationStatus.CHANGES_REQUESTED, GuideApplicationStatus.REJECTED, GuideApplicationStatus.SUSPENDED] as GuideApplicationStatus[])
      .includes(status) &&
    notes.trim().length < 5
  ) {
    throw new GuideOnboardingError("Add a brief note explaining this review decision.", 400);
  }

  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    const experience = await transaction.experience.findUnique({
      where: { id: experienceId },
      select: {
        id: true,
        verificationStatus: true,
        title: true,
        description: true,
        durationMinutes: true,
        meetingPoint: true,
        minGuests: true,
        maxGuests: true,
        inclusions: true,
        exclusions: true,
        cancellationPolicy: true,
        price: true,
        guide: { select: { verificationStatus: true, user: { select: { isActive: true, deletedAt: true } } } },
      },
    });
    if (!experience) throw new GuideOnboardingError("Experience not found.", 404);
    if (
      experience.verificationStatus === GuideApplicationStatus.APPROVED &&
      status !== GuideApplicationStatus.SUSPENDED
    ) {
      throw new GuideOnboardingError("An approved experience can only be suspended from this review surface.", 409);
    }
    if (
      experience.verificationStatus === GuideApplicationStatus.SUSPENDED &&
      status !== GuideApplicationStatus.APPROVED &&
      status !== GuideApplicationStatus.CHANGES_REQUESTED &&
      status !== GuideApplicationStatus.REJECTED
    ) {
      throw new GuideOnboardingError("A suspended experience must be reapproved or returned for further review.", 409);
    }
    if (
      status === GuideApplicationStatus.APPROVED &&
      experience.verificationStatus !== GuideApplicationStatus.DRAFT &&
      experience.verificationStatus !== GuideApplicationStatus.SUBMITTED &&
      experience.verificationStatus !== GuideApplicationStatus.PENDING &&
      experience.verificationStatus !== GuideApplicationStatus.CHANGES_REQUESTED &&
      experience.verificationStatus !== GuideApplicationStatus.SUSPENDED
    ) {
      throw new GuideOnboardingError("The experience must be submitted before it can be approved.", 409);
    }
    if (
      status === GuideApplicationStatus.APPROVED &&
      (experience.guide.verificationStatus !== GuideApplicationStatus.APPROVED ||
        !experience.guide.user.isActive ||
        experience.guide.user.deletedAt)
    ) {
      throw new GuideOnboardingError("Approve the guide account before approving this experience.", 409);
    }
    if (
      status === GuideApplicationStatus.APPROVED &&
      (!experience.title.trim() ||
        experience.description.trim().length < 40 ||
        !experience.durationMinutes ||
        !experience.meetingPoint?.trim() ||
        experience.minGuests < 1 ||
        experience.maxGuests < experience.minGuests ||
        experience.maxGuests > 10 ||
        !experience.inclusions.length ||
        !experience.exclusions.length ||
        !experience.cancellationPolicy.trim() ||
        !experience.price.gt(0))
    ) {
      throw new GuideOnboardingError("Complete experience details are required before approval.", 409);
    }

    await transaction.experience.update({
      where: { id: experience.id },
      data: {
        verificationStatus: status,
        ...(status === GuideApplicationStatus.APPROVED
          ? { status: "PUBLISHED" }
          : status === GuideApplicationStatus.CHANGES_REQUESTED ||
              status === GuideApplicationStatus.REJECTED
            ? { status: "DRAFT" }
            : {}),
      },
    });
    await transaction.auditLog.create({
      data: {
        userId: principal.id,
        action: "experience.verification.reviewed",
        entity: "Experience",
        entityId: experience.id,
        metadata: { status, notes: notes.trim() },
      },
    });
    return { id: experience.id, status };
  });
}
