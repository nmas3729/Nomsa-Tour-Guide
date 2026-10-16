import "server-only";

import { Prisma } from "@/src/server/db/generated/client";
import { AuthTokenType, GuideApplicationStatus, UserRole } from "@/src/server/db/generated/enums";
import { getPrismaClient } from "@/src/server/db/prisma";
import {
  guideRegistrationSchema,
  registrationSchema,
  type RegistrationInput,
  resetPasswordSchema,
} from "@/src/features/auth/schemas";
import { hashPassword, verifyPassword } from "@/src/features/auth/lib/password";
import {
  AUTH_TOKEN_EXPIRY,
  createAuthEventLogger,
  createOpaqueToken,
  hashOpaqueToken,
} from "@/src/features/auth/lib/tokens";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "./email";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";

export class InvalidAuthTokenError extends Error {
  constructor() {
    super("This link has expired or has already been used.");
    this.name = "InvalidAuthTokenError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Your current password is incorrect.");
    this.name = "InvalidCredentialsError";
  }
}

function splitList(value: string | undefined): string[] {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

async function issueAuthToken(userId: string, type: AuthTokenType) {
  const prisma = getPrismaClient();
  const { rawToken, tokenHash } = createOpaqueToken();
  const now = new Date();

  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type } }),
    prisma.authToken.create({
      data: {
        userId,
        type,
        tokenHash,
        expiresAt: new Date(now.getTime() + AUTH_TOKEN_EXPIRY[type]),
      },
    }),
  ]);

  return rawToken;
}

export async function registerAccount(input: RegistrationInput) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, message: "Check the highlighted fields and try again." };
  }

  const values = parsed.data;
  const prisma = getPrismaClient();

  try {
    const passwordHash = await hashPassword(values.password);

    const user = await prisma.$transaction(async (transaction) => {
      if (values.role === UserRole.CUSTOMER) {
        return transaction.user.create({
          data: {
            name: values.name,
            email: values.email,
            passwordHash,
            role: UserRole.CUSTOMER,
            isActive: false,
            customerProfile: { create: {} },
          },
          select: { id: true },
        });
      }

      const guide = guideRegistrationSchema.parse(values);
      return transaction.user.create({
        data: {
          name: guide.name,
          email: guide.email,
          passwordHash,
          role: UserRole.GUIDE,
          phone: guide.phone,
          isActive: false,
          guideProfile: {
            create: {
              biography: guide.biography,
              yearsExperience: guide.yearsExperience,
              specialties: splitList(guide.specialties),
              languages: splitList(guide.languages),
              operatingAreas: splitList(guide.operatingAreas),
              verificationStatus: GuideApplicationStatus.PENDING,
            },
          },
          guideApplications: {
            create: {
              fullName: guide.name,
              businessName: guide.businessName || null,
              businessRegistration: guide.businessRegistration || null,
              phone: guide.phone,
              email: guide.email,
              biography: guide.biography,
              yearsExperience: guide.yearsExperience,
              status: GuideApplicationStatus.PENDING,
              specialties: splitList(guide.specialties),
              languages: splitList(guide.languages),
              operatingAreas: splitList(guide.operatingAreas),
              emergencyContactName: guide.emergencyContactName,
              emergencyContactPhone: guide.emergencyContactPhone,
            },
          },
        },
        select: { id: true },
      });
    });

    const token = await issueAuthToken(user.id, AuthTokenType.EMAIL_VERIFICATION);
    await sendVerificationEmail(values.name, values.email, token);
    createAuthEventLogger("registration", { outcome: "created", role: values.role });

    return {
      success: true as const,
      message:
        "If this email can be registered, a verification link will arrive shortly. Guide applications remain pending until approved.",
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      createAuthEventLogger("registration", { outcome: "duplicate_email" });
      return {
        success: true as const,
        message:
          "If this email can be registered, a verification link will arrive shortly. Guide applications remain pending until approved.",
      };
    }

    createAuthEventLogger("registration", {
      outcome: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw error;
  }
}

export async function resendEmailVerification(email: string) {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true, deletedAt: true },
  });

  if (!user || user.emailVerified || user.deletedAt) {
    return;
  }

  const token = await issueAuthToken(user.id, AuthTokenType.EMAIL_VERIFICATION);
  await sendVerificationEmail(user.name, user.email, token);
  createAuthEventLogger("verification.resend", { outcome: "sent" });
}

export async function verifyEmailAddress(rawToken: string) {
  const prisma = getPrismaClient();
  const now = new Date();
  const tokenHash = hashOpaqueToken(rawToken);

  const verifiedUser = await prisma.$transaction(async (transaction) => {
    const authToken = await transaction.authToken.findFirst({
      where: {
        tokenHash,
        type: AuthTokenType.EMAIL_VERIFICATION,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      include: { user: true },
    });

    if (!authToken || authToken.user.emailVerified || authToken.user.deletedAt) {
      throw new InvalidAuthTokenError();
    }

    const consumed = await transaction.authToken.updateMany({
      where: { id: authToken.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) {
      throw new InvalidAuthTokenError();
    }

    const user = await transaction.user.update({
      where: { id: authToken.userId },
      data: {
        emailVerified: now,
        isActive: authToken.user.role === UserRole.CUSTOMER,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    await transaction.authToken.updateMany({
      where: { userId: user.id, type: AuthTokenType.EMAIL_VERIFICATION, id: { not: authToken.id } },
      data: { consumedAt: now },
    });

    return user;
  });

  createAuthEventLogger("verification", { outcome: "verified", role: verifiedUser.role });
  if (verifiedUser.role === UserRole.CUSTOMER) {
    try {
      await sendWelcomeEmail(verifiedUser.name, verifiedUser.email);
    } catch (error) {
      createAuthEventLogger("welcome_email", {
        outcome: "failed",
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }
}

export async function requestPasswordReset(email: string) {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true, isActive: true, deletedAt: true },
  });

  if (!user || !user.emailVerified || !user.isActive || user.deletedAt) {
    createAuthEventLogger("password_reset.request", { outcome: "not_eligible" });
    return;
  }

  const token = await issueAuthToken(user.id, AuthTokenType.PASSWORD_RESET);
  await sendPasswordResetEmail(user.name, user.email, token);
  createAuthEventLogger("password_reset.request", { outcome: "sent" });
}

export async function resetAccountPassword(rawInput: unknown) {
  const parsed = resetPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new InvalidAuthTokenError();
  }

  const { token, password } = parsed.data;
  const prisma = getPrismaClient();
  const now = new Date();
  const tokenHash = hashOpaqueToken(token);

  const updated = await prisma.$transaction(async (transaction) => {
    const authToken = await transaction.authToken.findFirst({
      where: {
        tokenHash,
        type: AuthTokenType.PASSWORD_RESET,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      include: { user: true },
    });

    if (!authToken || !authToken.user.emailVerified || !authToken.user.isActive || authToken.user.deletedAt) {
      throw new InvalidAuthTokenError();
    }

    const consumed = await transaction.authToken.updateMany({
      where: { id: authToken.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) {
      throw new InvalidAuthTokenError();
    }

    const passwordHash = await hashPassword(password);
    await transaction.user.update({
      where: { id: authToken.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await transaction.authToken.updateMany({
      where: { userId: authToken.userId, type: AuthTokenType.PASSWORD_RESET, id: { not: authToken.id } },
      data: { consumedAt: now },
    });

    return authToken.userId;
  });

  createAuthEventLogger("password_reset.complete", { outcome: "success", userId: updated });
}

export async function changeAccountPassword(
  principal: AuthenticatedPrincipal,
  currentPassword: string,
  nextPassword: string,
) {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: principal.id },
    select: { id: true, passwordHash: true },
  });

  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new InvalidCredentialsError();
  }

  const passwordHash = await hashPassword(nextPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    prisma.authToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
  ]);
  createAuthEventLogger("password_change", { outcome: "success", userId: user.id });
}

export async function authenticateCredentials(email: string, password: string) {
  const user = await getPrismaClient().user.findUnique({
    where: { email },
    include: { guideProfile: { select: { verificationStatus: true } } },
  });

  if (
    !user ||
    !user.passwordHash ||
    !user.emailVerified ||
    !user.isActive ||
    user.deletedAt ||
    (user.role === UserRole.GUIDE &&
      user.guideProfile?.verificationStatus !== GuideApplicationStatus.APPROVED)
  ) {
    createAuthEventLogger("login", { outcome: "rejected" });
    return null;
  }

  if (!(await verifyPassword(user.passwordHash, password))) {
    createAuthEventLogger("login", { outcome: "rejected" });
    return null;
  }

  createAuthEventLogger("login", { outcome: "success", userId: user.id, role: user.role });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
  };
}

export async function validateActivePrincipal(principal: AuthenticatedPrincipal) {
  const user = await getPrismaClient().user.findUnique({
    where: { id: principal.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      sessionVersion: true,
      emailVerified: true,
      isActive: true,
      deletedAt: true,
      guideProfile: { select: { verificationStatus: true } },
    },
  });

  if (
    !user ||
    !user.emailVerified ||
    !user.isActive ||
    user.deletedAt ||
    user.sessionVersion !== principal.sessionVersion ||
    (user.role === UserRole.GUIDE &&
      user.guideProfile?.verificationStatus !== GuideApplicationStatus.APPROVED)
  ) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sessionVersion: user.sessionVersion,
  } satisfies AuthenticatedPrincipal;
}
