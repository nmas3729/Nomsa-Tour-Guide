import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserRole } from "@/src/server/db/generated/enums";
import { requireAuthEnvironment } from "@/src/config/env";
import { getPrismaClient } from "@/src/server/db/prisma";
import { enforceAuthRateLimits, RateLimitExceededError } from "@/src/features/auth/lib/rate-limit";
import { createAuthEventLogger } from "@/src/features/auth/lib/tokens";
import { loginSchema } from "@/src/features/auth/schemas";
import { authenticateCredentials } from "@/src/features/auth/services/authentication";
import { isRouteRoleAllowed, protectedRouteRoles } from "@/src/lib/auth/route-access";

class LoginRateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

function createAuthConfig(): NextAuthConfig {
  const { AUTH_SECRET } = requireAuthEnvironment();
  const secureCookies = process.env.NODE_ENV === "production";

  return {
    secret: AUTH_SECRET,
    adapter: PrismaAdapter(getPrismaClient()),
    session: {
      strategy: "jwt",
      maxAge: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 12,
    },
    useSecureCookies: secureCookies,
    cookies: {
      sessionToken: {
        name: secureCookies ? "__Secure-authjs.session-token" : "authjs.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: secureCookies,
        },
      },
    },
    pages: {
      signIn: "/login",
      error: "/login",
      verifyRequest: "/verify-email",
    },
    providers: [
      Credentials({
        name: "Email and password",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials, request) {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            createAuthEventLogger("login", { outcome: "invalid_input" });
            return null;
          }

          const forwardedFor = request.headers.get("x-forwarded-for");
          const clientAddress =
            request.headers.get("x-real-ip") ??
            forwardedFor?.split(",").at(-1)?.trim() ??
            "unknown";

          try {
            await enforceAuthRateLimits({
              action: "login",
              identifier: parsed.data.email,
              clientAddress,
              limit: 10,
              addressLimit: 60,
              windowMs: 15 * 60 * 1000,
            });
          } catch (error) {
            if (error instanceof RateLimitExceededError) {
              createAuthEventLogger("login", { outcome: "rate_limited" });
              throw new LoginRateLimitedSignin();
            }
            throw error;
          }

          return authenticateCredentials(parsed.data.email, parsed.data.password);
        },
      }),
    ],
    callbacks: {
      async authorized({ auth, request }) {
        const roles = protectedRouteRoles(request.nextUrl.pathname);
        return roles === null
          ? true
          : Boolean(auth?.user && isRouteRoleAllowed(roles, auth.user.role));
      },
      async jwt({ token, user }) {
        if (user) {
          const authenticatedUser = user as typeof user & {
            role: UserRole;
            sessionVersion: number;
          };
          token.sub = authenticatedUser.id;
          token.role = authenticatedUser.role;
          token.sessionVersion = authenticatedUser.sessionVersion;
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user && token.sub && token.role) {
          session.user.id = token.sub;
          session.user.role = token.role;
          session.user.sessionVersion = token.sessionVersion ?? 0;
        }

        return session;
      },
    },
    events: {
      async signIn({ user }) {
        createAuthEventLogger("login.event", { outcome: "success", userId: user.id });
      },
      async signOut(message) {
        createAuthEventLogger("logout", {
          userId: "token" in message ? message.token?.sub ?? null : null,
        });
      },
    },
  };
}

const nextAuth = NextAuth(() => createAuthConfig());

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const auth = nextAuth.auth;
