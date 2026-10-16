import { NextResponse } from "next/server";
import { enforceAuthRateLimits, RateLimitExceededError } from "@/src/features/auth/lib/rate-limit";
import { createBooking, BookingError } from "@/src/server/services/booking-service";
import { createBookingSchema, idempotencyKeySchema } from "@/src/features/booking/schemas";
import { getServerEnvironment } from "@/src/config/env";
import { isSameOriginRequest } from "@/src/lib/security/origin";

const MAX_BOOKING_BODY_BYTES = 16_384;
const BOOKING_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const applicationUrl = getServerEnvironment().NEXT_PUBLIC_APP_URL;
  if (!applicationUrl) {
    return NextResponse.json({ error: "Booking service is unavailable." }, { status: 503 });
  }
  if (!isSameOriginRequest(request, applicationUrl)) {
    return NextResponse.json({ error: "Cross-origin booking requests are not allowed." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BOOKING_BODY_BYTES) {
    return NextResponse.json({ error: "Booking request is too large." }, { status: 413 });
  }

  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) {
    return NextResponse.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BOOKING_BODY_BYTES) {
      return NextResponse.json({ error: "Booking request is too large." }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Booking request must contain valid JSON." }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Booking details are invalid.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientAddress =
      request.headers.get("x-real-ip") ??
      forwardedFor?.split(",").at(-1)?.trim() ??
      "unknown";
    await enforceAuthRateLimits({
      action: "booking-create",
      identifier: parsed.data.leadTraveller.email,
      clientAddress,
      limit: 5,
      addressLimit: 20,
      windowMs: 15 * 60 * 1000,
    });
    const result = await createBooking(parsed.data, idempotencyKey.data);
    const response = NextResponse.json(
      { booking: result.booking, payfast: result.payfast },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
    response.cookies.set(`booking-access-${result.booking.id}`, idempotencyKey.data, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: `/api/bookings/${result.booking.id}`,
      maxAge: BOOKING_ACCESS_COOKIE_MAX_AGE,
    });
    return response;
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "booking.create.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Booking could not be created." }, { status: 500 });
  }
}
