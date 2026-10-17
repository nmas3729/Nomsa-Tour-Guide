import "server-only";

import { UserRole } from "@/src/server/db/generated/client";
import { getCurrentUser } from "@/src/lib/auth/session";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";

export type Permission =
  | "account:read"
  | "account:update"
  | "guide:apply"
  | "admin:manage-users"
  | "admin:manage-platform";

const permissions: Record<UserRole, readonly Permission[]> = {
  CUSTOMER: ["account:read", "account:update", "guide:apply"],
  GUIDE: ["account:read", "account:update"],
  ADMIN: ["account:read", "account:update", "admin:manage-users"],
  SUPER_ADMIN: [
    "account:read",
    "account:update",
    "admin:manage-users",
    "admin:manage-platform",
  ],
};

export class AuthorizationError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function hasRole(
  principal: Pick<AuthenticatedPrincipal, "role"> | null | undefined,
  required: UserRole | readonly UserRole[],
): boolean {
  if (!principal) {
    return false;
  }

  return (Array.isArray(required) ? required : [required]).includes(principal.role);
}

export function hasPermission(
  principal: Pick<AuthenticatedPrincipal, "role"> | null | undefined,
  permission: Permission,
): boolean {
  return Boolean(principal && permissions[principal.role].includes(permission));
}

export async function requireAuth(): Promise<AuthenticatedPrincipal> {
  const principal = await getCurrentUser();
  if (!principal) {
    throw new AuthorizationError("UNAUTHENTICATED", "Sign in is required.");
  }
  if (!hasVerifiedAuthenticator(principal)) {
    throw new AuthorizationError(
      "FORBIDDEN",
      "Two-factor authentication is required for this account.",
    );
  }
  return principal;
}

export async function requireRole(
  required: UserRole | readonly UserRole[],
): Promise<AuthenticatedPrincipal> {
  const principal = await requireAuth();
  if (!hasRole(principal, required)) {
    throw new AuthorizationError("FORBIDDEN", "You do not have permission to perform this action.");
  }
  return principal;
}

export async function requirePermission(permission: Permission): Promise<AuthenticatedPrincipal> {
  const principal = await requireAuth();
  if (!hasPermission(principal, permission)) {
    throw new AuthorizationError("FORBIDDEN", "You do not have permission to perform this action.");
  }
  return principal;
}

export const requireCustomer = () => requireRole(UserRole.CUSTOMER);
export const requireGuide = () => requireRole(UserRole.GUIDE);
export const requireAdmin = () => requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
export const requireSuperAdmin = () => requireRole(UserRole.SUPER_ADMIN);
