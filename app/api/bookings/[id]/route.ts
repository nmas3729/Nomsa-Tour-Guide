import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
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
    const booking = await getBookingConfirmation(id, key);
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
