import "server-only";

import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  MFA_ENCRYPTION_KEY: z.string().min(32).optional(),
  AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  BILLING_FROM_EMAIL: z.literal("billing@nomsatourguides.co.za").optional(),
  CONTACT_FROM_EMAIL: z.string().email().optional(),
  CONTACT_TO_EMAIL: z.string().email().optional(),
  GUIDE_APPLICATION_TO_EMAIL: z.string().email().optional(),
  GUIDE_APPLICATION_FROM_EMAIL: z.string().email().optional(),
  AUTH_TOKEN_SECRET: z.string().min(32).optional(),
  PAYFAST_MERCHANT_ID: z.string().optional(),
  PAYFAST_PASSPHRASE: z.string().optional(),
  PAYFAST_SANDBOX: z.enum(["true", "false"]).optional(),
  PAYFAST_SOURCE_IPS: z.string().optional(),
  CLEANUP_CRON_SECRET: z.string().min(32).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
});

export type ServerEnvironment = z.infer<typeof environmentSchema>;

export function getServerEnvironment(): ServerEnvironment {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    const invalidKeys = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter((key, index, keys) => keys.indexOf(key) === index);
    throw new Error(`Invalid environment configuration: ${invalidKeys.join(", ")}`);
  }

  return result.data;
}

export function requireAuthEnvironment() {
  const environment = getServerEnvironment();
  const missing = [
    !environment.DATABASE_URL && "DATABASE_URL",
    !environment.AUTH_SECRET && "AUTH_SECRET",
    !environment.AUTH_TOKEN_SECRET && "AUTH_TOKEN_SECRET",
    process.env.NODE_ENV === "production" &&
      !environment.AUTH_URL &&
      !process.env.VERCEL &&
      "AUTH_URL",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(`Missing required authentication configuration: ${missing.join(", ")}`);
  }

  return environment as ServerEnvironment & {
    DATABASE_URL: string;
    AUTH_SECRET: string;
    AUTH_TOKEN_SECRET: string;
  };
}

export function requireMfaEncryptionKey(): string {
  const key = getServerEnvironment().MFA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("MFA_ENCRYPTION_KEY must be configured to manage authenticator secrets.");
  }
  return key;
}

export function requireEmailEnvironment() {
  const environment = requireAuthEnvironment();
  const missing = [
    !environment.RESEND_API_KEY && "RESEND_API_KEY",
    !environment.EMAIL_FROM && "EMAIL_FROM",
    !environment.NEXT_PUBLIC_APP_URL && "NEXT_PUBLIC_APP_URL",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(`Missing required email configuration: ${missing.join(", ")}`);
  }

  return environment as typeof environment & {
    RESEND_API_KEY: string;
    EMAIL_FROM: string;
    NEXT_PUBLIC_APP_URL: string;
  };
}

export function requireContactEmailEnvironment() {
  const environment = getServerEnvironment();
  const missing = [
    !environment.RESEND_API_KEY && "RESEND_API_KEY",
    !environment.CONTACT_FROM_EMAIL && "CONTACT_FROM_EMAIL",
    !environment.CONTACT_TO_EMAIL && "CONTACT_TO_EMAIL",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(`Missing required contact email configuration: ${missing.join(", ")}`);
  }

  return environment as typeof environment & {
    RESEND_API_KEY: string;
    CONTACT_FROM_EMAIL: string;
    CONTACT_TO_EMAIL: string;
  };
}

export function requireBillingEmailEnvironment() {
  const environment = getServerEnvironment();
  const missing = [
    !environment.RESEND_API_KEY && "RESEND_API_KEY",
    !environment.BILLING_FROM_EMAIL && "BILLING_FROM_EMAIL",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(`Missing required billing email configuration: ${missing.join(", ")}`);
  }

  return environment as typeof environment & {
    RESEND_API_KEY: string;
    BILLING_FROM_EMAIL: "billing@nomsatourguides.co.za";
  };
}

export function requireGuideApplicationEmailEnvironment() {
  const environment = getServerEnvironment();
  const from = environment.GUIDE_APPLICATION_FROM_EMAIL ?? environment.EMAIL_FROM;
  const to = environment.GUIDE_APPLICATION_TO_EMAIL ?? "guides@nomsatourguides.co.za";
  const missing = [
    !environment.RESEND_API_KEY && "RESEND_API_KEY",
    !from && "GUIDE_APPLICATION_FROM_EMAIL or EMAIL_FROM",
    !to && "GUIDE_APPLICATION_TO_EMAIL",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(`Missing required guide application email configuration: ${missing.join(", ")}`);
  }

  return {
    RESEND_API_KEY: environment.RESEND_API_KEY!,
    GUIDE_APPLICATION_FROM_EMAIL: from!,
    GUIDE_APPLICATION_TO_EMAIL: to!,
  };
}

export function requireCloudinaryEnvironment() {
  const environment = getServerEnvironment();
  const missing = [
    !environment.CLOUDINARY_CLOUD_NAME && "CLOUDINARY_CLOUD_NAME",
    !environment.CLOUDINARY_API_KEY && "CLOUDINARY_API_KEY",
    !environment.CLOUDINARY_API_SECRET && "CLOUDINARY_API_SECRET",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(`Missing required Cloudinary configuration: ${missing.join(", ")}`);
  }

  return environment as typeof environment & {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
  };
}
