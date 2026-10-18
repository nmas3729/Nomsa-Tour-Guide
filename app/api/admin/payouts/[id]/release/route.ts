import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnvironment } from "@/src/config/env";
import { getCurrentUser } from "@/src/lib/auth/session";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import {
  BookingFinancialError,
  recordPayoutPaid,
} from "@/src/server/services/booking-financial-service";

const releaseSchema = z.object({
  eftReference: z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9./ _-]+$/),
}).strict();

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
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must contain valid JSON." }, { status: 400 });
  }
  const parsed = releaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid confirmed transfer reference is required." }, { status: 400 });
  }
  try {
    const result = await recordPayoutPaid(id, parsed.data.eftReference, principal);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof BookingFinancialError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "payout.manual_release.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Payout release could not be recorded." }, { status: 500 });
  }
}
