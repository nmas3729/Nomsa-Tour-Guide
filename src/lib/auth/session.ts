import "server-only";

import type { Session } from "next-auth";
import { auth as nextAuth } from "@/auth";
import { validateActivePrincipal } from "@/src/features/auth/services/authentication";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";

export async function getServerSession(): Promise<Session | null> {
  const session = await nextAuth();
  const user = session?.user;

  if (!session || !user?.id || !user.email || !user.name || !user.role) {
    return null;
  }

  const principal = await validateActivePrincipal({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sessionVersion: user.sessionVersion,
  });

  if (!principal) {
    return null;
  }

  return { ...session, user: { ...user, ...principal } };
}

export async function getCurrentUser(): Promise<AuthenticatedPrincipal | null> {
  return (await getServerSession())?.user ?? null;
}

export async function getCurrentRole() {
  return (await getCurrentUser())?.role ?? null;
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}
