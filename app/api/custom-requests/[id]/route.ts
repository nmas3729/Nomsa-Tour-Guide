import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnvironment } from "@/src/config/env";
import { enforceAuthRateLimit, RateLimitExceededError } from "@/src/features/auth/lib/rate-limit";
import { getCurrentUser } from "@/src/lib/auth/session";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import {
  acceptCustomRequestOffer,
  assignCustomRequest,
  CustomRequestWorkflowError,
  declineCustomRequest,
  submitCustomRequestOffer,
} from "@/src/server/services/custom-request-workflow-service";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign"),
    guideProfileId: z.string().uuid(),
  }).strict(),
  z.object({
    action: z.literal("offer"),
    experienceId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeSlot: z.enum(["09:00 AM", "02:00 PM"]),
    travellerCount: z.number().int().min(1).max(20),
    amount: z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/),
  }).strict(),
  z.object({
    action: z.literal("accept"),
  }).strict(),
  z.object({
    action: z.literal("decline"),
    reason: z.string().trim().max(500).default(""),
  }).strict(),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const principal = await getCurrentUser();
  if (!principal) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const appUrl = getServerEnvironment().NEXT_PUBLIC_APP_URL;
  if (!appUrl || !isSameOriginRequest(request, appUrl)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Custom request not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must contain valid JSON." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "The custom request response is invalid." }, { status: 400 });
  }

  try {
    await enforceAuthRateLimit({
      action: `custom-request-${parsed.data.action}`,
      identifier: principal.id,
      clientAddress: request.headers.get("x-real-ip") ?? "unknown",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    let result;
    switch (parsed.data.action) {
      case "assign":
        result = await assignCustomRequest(principal, id, parsed.data.guideProfileId);
        break;
      case "offer":
        result = await submitCustomRequestOffer(principal, id, parsed.data);
        break;
      case "accept":
        result = await acceptCustomRequestOffer(principal, id);
        break;
      case "decline":
        result = await declineCustomRequest(principal, id, parsed.data.reason);
        break;
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof CustomRequestWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "custom_itinerary.response.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "The custom itinerary response could not be saved." }, { status: 500 });
  }
}
