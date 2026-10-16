import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerEnvironment } from "@/src/config/env";
import { cleanupExpiredBookingReservations } from "@/src/server/services/booking-service";

function matchesSecret(authorization: string | null, expected: string): boolean {
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }
  const received = Buffer.from(authorization.slice("Bearer ".length));
  const configured = Buffer.from(expected);
  return received.length === configured.length && timingSafeEqual(received, configured);
}

export async function POST(request: Request) {
  const secret = getServerEnvironment().CLEANUP_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Reservation cleanup is not configured." }, { status: 503 });
  }
  if (!matchesSecret(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await cleanupExpiredBookingReservations();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "availability.cleanup.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { error: "Expired reservations could not be cleaned up." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
