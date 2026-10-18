import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnvironment } from "@/src/config/env";
import { getCurrentUser } from "@/src/lib/auth/session";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import {
  BookingFinancialError,
  markBookingCompleted,
} from "@/src/server/services/booking-financial-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const principal = await getCurrentUser();
  if (!principal) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const appUrl = getServerEnvironment().NEXT_PUBLIC_APP_URL;
  if (!appUrl || !isSameOriginRequest(request, appUrl)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  try {
    const result = await markBookingCompleted(id, principal);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof BookingFinancialError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "booking.service_completion.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Booking completion could not be recorded." }, { status: 500 });
  }
}
