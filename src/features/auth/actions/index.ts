"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loginSchema, registrationSchema } from "@/src/features/auth/schemas";
import type { AuthActionResult } from "@/src/features/auth/types";
import { safeReturnPath } from "@/src/features/auth/lib/redirects";
import { enforceAuthRateLimits, RateLimitExceededError } from "@/src/features/auth/lib/rate-limit";
import { createAuthEventLogger, hashOpaqueToken } from "@/src/features/auth/lib/tokens";
import {
  changeAccountPassword,
  beginAuthenticatorSetup,
  confirmAuthenticatorSetup,
  InvalidAuthenticatorCodeError,
  InvalidAuthTokenError,
  InvalidCredentialsError,
  registerAccount,
  requestPasswordReset,
  resendEmailVerification,
  resetAccountPassword,
  verifyEmailAddress,
} from "@/src/features/auth/services/authentication";
import {
  changePasswordSchema,
  emailVerificationSchema,
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  totpCodeSchema,
} from "@/src/features/auth/schemas";
import { getCurrentUser } from "@/src/lib/auth/session";
import { hasVerifiedAuthenticator, requiresAuthenticatorApp } from "@/src/features/auth/lib/privileged-mfa";

async function getClientAddress(): Promise<string> {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-real-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown"
  );
}

function validationErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Boolean(entry[1]),
    ),
  );
}

export async function registerAction(input: unknown): Promise<AuthActionResult> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  try {
    await enforceAuthRateLimits({
      action: "register",
      identifier: parsed.data.email,
      clientAddress: await getClientAddress(),
      limit: 5,
      addressLimit: 25,
      windowMs: 60 * 60 * 1000,
    });
    const result = await registerAccount(parsed.data);
    return result;
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { success: false, message: error.message };
    }

    createAuthEventLogger("registration.action", {
      outcome: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      message: "We couldn't complete registration right now. Please try again shortly.",
    };
  }
}

export async function loginAction(input: unknown): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Enter a valid email and password.",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  const redirectTo = safeReturnPath(parsed.data.callbackUrl, "/dashboard");

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      totpCode: parsed.data.totpCode,
      redirect: false,
      redirectTo,
    });
    const resultUrl = new URL(result, "http://localhost");
    const errorCode = resultUrl.searchParams.get("code");
    if (resultUrl.searchParams.has("error")) {
      return {
        success: false,
        message:
          errorCode === "rate_limited"
            ? "Too many sign-in attempts. Please wait and try again."
            : errorCode === "invalid_authenticator_code"
              ? "That authenticator code is invalid or expired. Try the current 6-digit code."
              : "We couldn't sign you in. Check your details, verify your email, or contact support if your guide application is pending.",
      };
    }

    return { success: true, message: "Signed in.", redirectTo };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        message: "We couldn't sign you in. Check your details, verify your email, or contact support if your guide application is pending.",
      };
    }

    createAuthEventLogger("login.action", {
      outcome: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, message: "Sign-in is temporarily unavailable. Please try again." };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function forgotPasswordAction(input: unknown): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Enter a valid email address.",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  try {
    await enforceAuthRateLimits({
      action: "forgot-password",
      identifier: parsed.data.email,
      clientAddress: await getClientAddress(),
      limit: 5,
      addressLimit: 20,
      windowMs: 60 * 60 * 1000,
    });
    await requestPasswordReset(parsed.data.email);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { success: false, message: error.message };
    }
    createAuthEventLogger("password_reset.action", {
      outcome: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return {
    success: true,
    message: "If an eligible account exists for this email, password reset instructions will arrive shortly.",
  };
}

export async function resetPasswordAction(input: unknown): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the password requirements and try again.",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  try {
    await enforceAuthRateLimits({
      action: "reset-password",
      identifier: hashOpaqueToken(parsed.data.token),
      clientAddress: await getClientAddress(),
      limit: 5,
      addressLimit: 20,
      windowMs: 60 * 60 * 1000,
    });
    await resetAccountPassword(parsed.data);
    return { success: true, message: "Your password has been reset. Sign in with your new password." };
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { success: false, message: error.message };
    }
    if (error instanceof InvalidAuthTokenError) {
      return { success: false, message: error.message };
    }
    createAuthEventLogger("password_reset.action", {
      outcome: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, message: "We couldn't reset your password. Please try again shortly." };
  }
}

export async function verifyEmailAction(input: unknown): Promise<AuthActionResult> {
  const parsed = emailVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "This verification link is invalid or expired." };
  }

  try {
    await enforceAuthRateLimits({
      action: "verify-email",
      identifier: hashOpaqueToken(parsed.data.token),
      clientAddress: await getClientAddress(),
      limit: 5,
      addressLimit: 20,
      windowMs: 60 * 60 * 1000,
    });
    await verifyEmailAddress(parsed.data.token);
    return { success: true, message: "Your email is verified." };
  } catch (error) {
    if (error instanceof RateLimitExceededError || error instanceof InvalidAuthTokenError) {
      return { success: false, message: error.message };
    }
    createAuthEventLogger("verification.action", {
      outcome: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, message: "We couldn't verify your email. Please request a new link." };
  }
}

export async function resendVerificationAction(input: unknown): Promise<AuthActionResult> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Enter a valid email address.",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  try {
    await enforceAuthRateLimits({
      action: "resend-verification",
      identifier: parsed.data.email,
      clientAddress: await getClientAddress(),
      limit: 5,
      addressLimit: 20,
      windowMs: 60 * 60 * 1000,
    });
    await resendEmailVerification(parsed.data.email);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { success: false, message: error.message };
    }
    createAuthEventLogger("verification.resend", {
      outcome: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, message: "We couldn't send a verification email right now. Please try again." };
  }

  return {
    success: true,
    message: "If your email needs verification, a new link will arrive shortly.",
  };
}

export async function changePasswordAction(input: unknown): Promise<AuthActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  const principal = await getCurrentUser();
  if (!principal) {
    return { success: false, message: "Your session has expired. Sign in again." };
  }
  if (!hasVerifiedAuthenticator(principal)) {
    return {
      success: false,
      message: "Two-factor authentication is required for this account. Complete setup before continuing.",
      redirectTo: "/account/security/two-factor",
    };
  }

  try {
    await changeAccountPassword(principal, parsed.data.currentPassword, parsed.data.password);
    await signOut({ redirect: false });
    return {
      success: true,
      message: "Password changed. Please sign in again with your new password.",
      redirectTo: "/login",
    };
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return { success: false, message: error.message };
    }
    createAuthEventLogger("password_change.action", {
      outcome: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, message: "We couldn't change your password right now." };
  }
}

export async function beginAuthenticatorSetupAction(): Promise<{
  success: boolean;
  message: string;
  secret?: string;
  uri?: string;
}> {
  const principal = await getCurrentUser();
  if (!principal) {
    return { success: false, message: "Your session has expired. Sign in again." };
  }
  if (!requiresAuthenticatorApp(principal.role)) {
    return { success: false, message: "Authenticator setup is required only for guide and admin accounts." };
  }
  try {
    const setup = await beginAuthenticatorSetup(principal);
    return {
      success: true,
      message: "Add this account to your authenticator app, then enter the 6-digit code.",
      ...setup,
    };
  } catch (error) {
    createAuthEventLogger("mfa.setup_action", {
      outcome: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
      userId: principal.id,
    });
    return { success: false, message: "Authenticator setup could not be started. Please try again." };
  }
}

export async function confirmAuthenticatorSetupAction(input: unknown): Promise<AuthActionResult> {
  const parsed = totpCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Enter the 6-digit code from your authenticator app." };
  }

  const principal = await getCurrentUser();
  if (!principal) {
    return { success: false, message: "Your session has expired. Sign in again." };
  }
  try {
    await enforceAuthRateLimits({
      action: "mfa-setup-confirm",
      identifier: principal.id,
      clientAddress: await getClientAddress(),
      limit: 5,
      addressLimit: 20,
      windowMs: 15 * 60 * 1000,
    });
    await confirmAuthenticatorSetup(principal, parsed.data.code);
    return {
      success: true,
      message: "Authenticator app verification is enabled. Sign in again with your password and current 6-digit code.",
      redirectTo: "/login?mfaEnabled=1",
    };
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { success: false, message: error.message };
    }
    if (error instanceof InvalidAuthenticatorCodeError) {
      return { success: false, message: error.message };
    }
    createAuthEventLogger("mfa.confirm_action", {
      outcome: "failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
      userId: principal.id,
    });
    return { success: false, message: "Authenticator setup could not be confirmed. Please try again." };
  }
}
