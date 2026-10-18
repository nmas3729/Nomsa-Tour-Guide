import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@/src/server/db/generated/enums";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getBookingConfirmation } from "@/src/server/services/booking-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  try {
    const access = await cookies();
    const key = access.get(`booking-access-${id}`)?.value;
    const principal = await getCurrentUser();
    const customerId = principal?.role === UserRole.CUSTOMER ? principal.id : undefined;
    const booking = await getBookingConfirmation(id, key, customerId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or access has expired." },
        { status: 404, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    return NextResponse.json(
      { booking },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error(JSON.stringify({
      event: "booking.lookup.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { error: "Booking details are temporarily unavailable." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
