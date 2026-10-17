import type { UserRole } from "@/src/server/db/generated/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      sessionVersion: number;
      mfaVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    sessionVersion: number;
    mfaVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    sessionVersion?: number;
    mfaVerified?: boolean;
  }
}
