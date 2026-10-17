import type { UserRole } from "@/src/server/db/generated/client";

export type AuthActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  redirectTo?: string;
};

export type AuthenticatedPrincipal = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sessionVersion: number;
  mfaVerified: boolean;
};
