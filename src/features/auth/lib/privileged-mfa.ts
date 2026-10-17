import { UserRole } from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";

export function requiresAuthenticatorApp(role: UserRole): boolean {
  return role === UserRole.GUIDE || role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

export function canAccessMfaProtectedSurface(
  role: UserRole | undefined,
  mfaVerified: boolean | undefined,
  isMfaSetupPath: boolean,
): boolean {
  return (
    isMfaSetupPath ||
    !role ||
    !requiresAuthenticatorApp(role) ||
    mfaVerified === true
  );
}

export function hasVerifiedAuthenticator(
  principal: Pick<AuthenticatedPrincipal, "role" | "mfaVerified">,
): boolean {
  return !requiresAuthenticatorApp(principal.role) || principal.mfaVerified;
}
