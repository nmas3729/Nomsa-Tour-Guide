import { NextResponse } from "next/server";
import { UserRole, GuideApplicationStatus } from "@/src/server/db/generated/enums";
import { getCurrentUser } from "@/src/lib/auth/session";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";
import { getPrismaClient } from "@/src/server/db/prisma";

export async function GET() {
  const principal = await getCurrentUser();
  if (!principal) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  if (
    (principal.role !== UserRole.ADMIN && principal.role !== UserRole.SUPER_ADMIN) ||
    !hasVerifiedAuthenticator(principal)
  ) {
    return NextResponse.json({ error: "Administrator access with two-factor authentication is required." }, { status: 403 });
  }

  try {
    const guides = await getPrismaClient().guideProfile.findMany({
      where: {
        verificationStatus: GuideApplicationStatus.APPROVED,
        deletedAt: null,
        user: { is: { isActive: true, deletedAt: null } },
      },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    });
    return NextResponse.json(
      { guides: guides.map(({ id, user }) => ({ id, name: user.name })) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error(JSON.stringify({
      event: "custom_itinerary.guide_options.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Approved guide options are unavailable." }, { status: 500 });
  }
}
