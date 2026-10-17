import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnvironment } from "@/src/config/env";
import { isRouteRoleAllowed, protectedRouteRoles } from "@/src/lib/auth/route-access";
import { canAccessMfaProtectedSurface } from "@/src/features/auth/lib/privileged-mfa";
import { UserRole } from "@/src/server/db/generated/enums";

function createContentSecurityPolicy(nonce: string): string {
  const development = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://www.payfast.co.za https://sandbox.payfast.co.za",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  contentSecurityPolicy: string,
): NextResponse {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000",
    );
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const allowedRoles = protectedRouteRoles(request.nextUrl.pathname);
  if (allowedRoles === null) {
    return applySecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      request,
      contentSecurityPolicy,
    );
  }

  const { AUTH_SECRET } = getServerEnvironment();
  if (!AUTH_SECRET) {
    throw new Error("AUTH_SECRET must be configured to protect authenticated routes.");
  }

  const token = await getToken({
    req: request,
    secret: AUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

  if (!token?.sub) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return applySecurityHeaders(
      NextResponse.redirect(loginUrl),
      request,
      contentSecurityPolicy,
    );
  }

  if (!isRouteRoleAllowed(allowedRoles, token.role)) {
    return applySecurityHeaders(
      new NextResponse("Forbidden", { status: 403 }),
      request,
      contentSecurityPolicy,
    );
  }

  const isMfaSetupPath = request.nextUrl.pathname === "/account/security/two-factor";
  const role = token.role as UserRole | undefined;
  if (!canAccessMfaProtectedSurface(role, token.mfaVerified === true, isMfaSetupPath)) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/account/security/two-factor", request.url)),
      request,
      contentSecurityPolicy,
    );
  }

  return applySecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    request,
    contentSecurityPolicy,
  );
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
