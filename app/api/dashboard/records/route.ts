import { NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@/src/server/db/generated/enums";
import { getCurrentUser } from "@/src/lib/auth/session";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";
import { getPrismaClient } from "@/src/server/db/prisma";

function csvCell(value: string | number | null | undefined): string {
  let text = String(value ?? "");
  if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export async function GET(request: Request) {
  const principal = await getCurrentUser();
  if (!principal) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  if (!hasVerifiedAuthenticator(principal)) {
    return NextResponse.json({ error: "Two-factor authentication is required." }, { status: 403 });
  }
  if (
    principal.role !== UserRole.GUIDE &&
    principal.role !== UserRole.ADMIN &&
    principal.role !== UserRole.SUPER_ADMIN
  ) {
    return NextResponse.json({ error: "You are not allowed to download these records." }, { status: 403 });
  }
  const type = z.enum(["bookings", "payouts"]).safeParse(
    new URL(request.url).searchParams.get("type"),
  );
  if (!type.success) {
    return NextResponse.json({ error: "Choose bookings or payouts." }, { status: 400 });
  }

  try {
    const prisma = getPrismaClient();
    const isAdmin = principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN;
    const guide = isAdmin
      ? null
      : await prisma.guideProfile.findUnique({
          where: { userId: principal.id },
          select: { id: true },
        });
    if (!isAdmin && !guide) {
      return NextResponse.json({ error: "A guide profile is required to download these records." }, { status: 403 });
    }

    let rows: Array<Array<string | number | null | undefined>>;
    if (type.data === "bookings") {
      const bookings = await prisma.booking.findMany({
        where: isAdmin ? {} : { guideId: guide!.id },
        include: {
          customer: { select: { name: true, email: true } },
          experience: { select: { title: true } },
          payments: {
            select: { status: true, amount: true, refundedAmount: true, currency: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });
      rows = [
        ["booking_id", "booking_type", "experience", "date", "time_slot", "traveller_count", "customer_name", "customer_email", "booking_status", "payment_status", "base_amount", "optional_extras_amount", "transport_amount", "platform_fee_amount", "tax_amount", "total_price", "currency", "refunded_amount", "cancellation_policy", "service_completed_at"],
        ...bookings.map((booking) => [
          booking.id,
          booking.bookingType,
          booking.experience.title,
          booking.experienceDate.toISOString().slice(0, 10),
          booking.timeSlot,
          booking.travellerCount,
          booking.customer.name,
          booking.customer.email,
          booking.status,
          booking.paymentStatus,
          booking.baseAmount?.toFixed(2) ?? "Unavailable",
          booking.optionalExtrasAmount?.toFixed(2) ?? "Unavailable",
          booking.transportAmount?.toFixed(2) ?? "Unavailable",
          booking.platformFeeAmount?.toFixed(2) ?? "Unavailable",
          booking.taxAmount?.toFixed(2) ?? "Unavailable",
          booking.totalPrice.toFixed(2),
          booking.currency,
          booking.payments[0]?.refundedAmount.toFixed(2) ?? "0.00",
          booking.cancellationPolicySnapshot ?? "Not recorded",
          booking.serviceCompletedAt?.toISOString() ?? "",
        ]),
      ];
    } else {
      const payouts = await prisma.payout.findMany({
        where: isAdmin ? {} : { guideId: guide!.id },
        include: { booking: { include: { experience: { select: { title: true } } } } },
        orderBy: { createdAt: "desc" },
      });
      rows = [
        ["payout_id", "booking_id", "experience", "status", "gross_amount", "commission_rate", "commission_amount", "payout_amount", "currency", "eligible_at", "paid_at", "transfer_reference"],
        ...payouts.map((payout) => [
          payout.id,
          payout.bookingId,
          payout.booking.experience.title,
          payout.status,
          payout.grossAmount?.toFixed(2) ?? "Unavailable",
          payout.commissionRate?.toString() ?? "Unavailable",
          payout.commissionAmount?.toFixed(2) ?? "Unavailable",
          payout.amount.toFixed(2),
          payout.currency,
          payout.eligibleAt?.toISOString() ?? "Unavailable",
          payout.paidAt?.toISOString() ?? "",
          payout.eftReference ?? "",
        ]),
      ];
    }

    await prisma.auditLog.create({
      data: {
        userId: principal.id,
        action: "booking_records.downloaded",
        entity: type.data === "bookings" ? "Booking" : "Payout",
        entityId: "export",
        metadata: { type: type.data, count: rows.length - 1 },
      },
    });

    return new Response(csv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type.data}-records.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "booking_records.download.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { error: "Records are temporarily unavailable." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
