import { UserRole } from "@/src/server/db/generated/enums";

export function protectedRouteRoles(pathname: string): readonly UserRole[] | null {
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/")
  ) {
    return [];
  }
  if (pathname === "/customer" || pathname.startsWith("/customer/")) {
    return [UserRole.CUSTOMER];
  }
  if (pathname === "/guide" || pathname.startsWith("/guide/")) {
    return [UserRole.GUIDE];
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return [UserRole.ADMIN, UserRole.SUPER_ADMIN];
  }
  return null;
}

export function isRouteRoleAllowed(
  requiredRoles: readonly UserRole[],
  role: UserRole | undefined,
): boolean {
  return requiredRoles.length === 0
    ? role !== undefined
    : Boolean(role && requiredRoles.includes(role));
}
