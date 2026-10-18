import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnvironment } from "@/src/config/env";
import { PaymentStatus } from "@/src/server/db/generated/enums";
import { getCurrentUser } from "@/src/lib/auth/session";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import {
  BookingFinancialError,
  updatePaymentRecord,
} from "@/src/server/services/booking-financial-service";

const updateSchema = z.object({
  status: z.enum([
    PaymentStatus.SUCCEEDED,
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.REFUND_PENDING,
    PaymentStatus.REFUNDED,
    PaymentStatus.DISPUTED,
  ]),
  refundedAmount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
}).strict();

export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must contain valid JSON." }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payment update is invalid." }, { status: 400 });
  }
  try {
    const result = await updatePaymentRecord(
      id,
      parsed.data.status,
      parsed.data.refundedAmount,
      principal,
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof BookingFinancialError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "payment.manual_update.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Payment update could not be recorded." }, { status: 500 });
  }
}
