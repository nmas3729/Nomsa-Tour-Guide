import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@/src/server/db/generated/enums";
import { Prisma } from "@/src/server/db/generated/client";
import { getServerEnvironment } from "@/src/config/env";
import { getCurrentUser } from "@/src/lib/auth/session";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import { enforceAuthRateLimit, RateLimitExceededError } from "@/src/features/auth/lib/rate-limit";
import { getPrismaClient } from "@/src/server/db/prisma";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= new Date().toISOString().slice(0, 10)
  );
});

const requestSchema = z.object({
  destinationText: z.string().trim().min(2).max(120),
  travelStartDate: dateSchema.nullable(),
  travelEndDate: dateSchema.nullable(),
  flexibleDates: z.boolean(),
  travellerCount: z.number().int().min(1).max(20),
  budget: z.string().regex(/^\d+(?:\.\d{1,2})?$/).nullable(),
  budgetCurrency: z.literal("ZAR").nullable(),
  interests: z.array(z.string().trim().min(1).max(80)).max(8),
  accommodationNeeded: z.boolean(),
  transportNeeded: z.boolean(),
  languages: z.array(z.string().trim().min(1).max(60)).max(8),
  notes: z.string().trim().max(2000),
}).strict().superRefine((value, context) => {
  if (!value.flexibleDates && (!value.travelStartDate || !value.travelEndDate)) {
    context.addIssue({ code: "custom", message: "Choose travel dates or mark them flexible." });
  }
  if (value.travelStartDate && value.travelEndDate && value.travelEndDate < value.travelStartDate) {
    context.addIssue({ code: "custom", message: "Travel end date must be on or after the start date." });
  }
  if (Boolean(value.budget) !== Boolean(value.budgetCurrency)) {
    context.addIssue({ code: "custom", message: "Choose a budget currency with the budget." });
  }
});

const MAX_REQUEST_BODY_BYTES = 8_192;
const idempotencyKeySchema = z.string().uuid();

export async function POST(request: Request) {
  const applicationUrl = getServerEnvironment().NEXT_PUBLIC_APP_URL;
  if (!applicationUrl || !isSameOriginRequest(request, applicationUrl)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const principal = await getCurrentUser();
  if (!principal) return NextResponse.json({ error: "Sign in to submit a custom itinerary request." }, { status: 401 });
  if (principal.role !== UserRole.CUSTOMER) {
    return NextResponse.json({ error: "Only traveller accounts can submit itinerary requests." }, { status: 403 });
  }
  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) {
    return NextResponse.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json({ error: "Itinerary request is too large." }, { status: 413 });
  }
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json({ error: "Itinerary request is too large." }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request must contain valid JSON." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the itinerary request details." }, { status: 400 });
  }
  const value = parsed.data;
  const idempotencyKeyHash = createHash("sha256").update(idempotencyKey.data).digest("hex");
  const requestHash = createHash("sha256").update(JSON.stringify(value)).digest("hex");

  try {
    await enforceAuthRateLimit({
      action: "custom-itinerary-request",
      identifier: principal.id,
      clientAddress: request.headers.get("x-real-ip") ?? "unknown",
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    const record = await getPrismaClient().$transaction(async (transaction) => {
      const existing = await transaction.customRequest.findUnique({
        where: { idempotencyKeyHash },
        select: { id: true, customerId: true, status: true, bookingType: true, requestHash: true },
      });
      if (existing) {
        if (existing.customerId !== principal.id) {
          return { conflict: true as const };
        }
        if (existing.requestHash !== requestHash) {
          return { conflict: true as const };
        }
        return {
          duplicate: true as const,
          request: { id: existing.id, status: existing.status, bookingType: existing.bookingType },
        };
      }
      const created = await transaction.customRequest.create({
        data: {
          idempotencyKeyHash,
          requestHash,
          customerId: principal.id,
          destinationText: value.destinationText,
          travelStartDate: value.travelStartDate ? new Date(`${value.travelStartDate}T00:00:00.000Z`) : null,
          travelEndDate: value.travelEndDate ? new Date(`${value.travelEndDate}T00:00:00.000Z`) : null,
          flexibleDates: value.flexibleDates,
          travellerCount: value.travellerCount,
          budget: value.budget ? new Prisma.Decimal(value.budget) : null,
          budgetCurrency: value.budgetCurrency,
          interests: value.interests,
          accommodationNeeded: value.accommodationNeeded,
          transportNeeded: value.transportNeeded,
          languages: value.languages,
          notes: value.notes || null,
          bookingType: "REQUEST_TO_BOOK",
        },
        select: { id: true, status: true, bookingType: true },
      });
      await transaction.auditLog.create({
        data: {
          userId: principal.id,
          action: "custom_itinerary.request_submitted",
          entity: "CustomRequest",
          entityId: created.id,
          metadata: { bookingType: created.bookingType },
        },
      });
      return { duplicate: false as const, request: created };
    });
    if ("conflict" in record) {
      return NextResponse.json(
        { error: "This idempotency key was already used for different itinerary details." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        request: record.request,
        message: "Request submitted. No booking, quote, or payment has been confirmed.",
      },
      { status: record.duplicate ? 200 : 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      try {
        const existing = await getPrismaClient().customRequest.findUnique({
          where: { idempotencyKeyHash },
          select: { id: true, customerId: true, status: true, bookingType: true, requestHash: true },
        });
        if (existing?.customerId === principal.id && existing.requestHash === requestHash) {
          return NextResponse.json({
            request: { id: existing.id, status: existing.status, bookingType: existing.bookingType },
            message: "Request submitted. No booking, quote, or payment has been confirmed.",
          }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
        }
        if (existing && (existing.customerId !== principal.id || existing.requestHash !== requestHash)) {
          return NextResponse.json(
            { error: "This idempotency key was already used for different itinerary details." },
            { status: 409 },
          );
        }
      } catch (lookupError) {
        console.error(JSON.stringify({
          event: "custom_itinerary.idempotency_lookup.failed",
          errorName: lookupError instanceof Error ? lookupError.name : "UnknownError",
        }));
        return NextResponse.json({ error: "The request status could not be confirmed." }, { status: 500 });
      }
      return NextResponse.json({ error: "This itinerary request has already been submitted." }, { status: 409 });
    }
    console.error(JSON.stringify({
      event: "custom_itinerary.request_create.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Itinerary request could not be submitted." }, { status: 500 });
  }
}
