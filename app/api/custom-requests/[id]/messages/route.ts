import { NextResponse } from "next/server";
import { z } from "zod";
import { GuideApplicationStatus, UserRole } from "@/src/server/db/generated/enums";
import { getServerEnvironment } from "@/src/config/env";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";
import { enforceAuthRateLimit, RateLimitExceededError } from "@/src/features/auth/lib/rate-limit";
import { getCurrentUser } from "@/src/lib/auth/session";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import { getPrismaClient } from "@/src/server/db/prisma";

const messageSchema = z.object({
  body: z.string().trim().min(1).max(3000),
}).strict();
const MAX_BODY_BYTES = 4_096;

async function resolveAccess(requestId: string, principal: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const request = await getPrismaClient().customRequest.findUnique({
    where: { id: requestId },
    select: { id: true, customerId: true, assignedGuideId: true },
  });
  if (!request) return null;
  if (principal.role === UserRole.CUSTOMER) {
    return request.customerId === principal.id ? request : null;
  }
  if (principal.role === UserRole.GUIDE) {
    if (!hasVerifiedAuthenticator(principal)) return null;
    const guide = await getPrismaClient().guideProfile.findUnique({
      where: {
        userId: principal.id,
        verificationStatus: GuideApplicationStatus.APPROVED,
        deletedAt: null,
        user: { is: { isActive: true, deletedAt: null } },
      },
      select: { id: true },
    });
    return guide?.id === request.assignedGuideId ? request : null;
  }
  if (
    (principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN) &&
    hasVerifiedAuthenticator(principal)
  ) {
    return request;
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const principal = await getCurrentUser();
  if (!principal) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Custom request not found." }, { status: 404 });
  }
  const access = await resolveAccess(id, principal);
  if (!access) return NextResponse.json({ error: "Custom request not found." }, { status: 404 });

  try {
    const messages = await getPrismaClient().requestReply.findMany({
      where: { customRequestId: id },
      select: {
        id: true,
        body: true,
        createdAt: true,
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json(
      { messages },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error(JSON.stringify({
      event: "custom_itinerary.messages_read.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Messages are temporarily unavailable." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const principal = await getCurrentUser();
  if (!principal) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  if (principal.role !== UserRole.CUSTOMER && principal.role !== UserRole.GUIDE) {
    return NextResponse.json({ error: "Only the traveller or assigned guide can send messages." }, { status: 403 });
  }
  const appUrl = getServerEnvironment().NEXT_PUBLIC_APP_URL;
  if (!appUrl || !isSameOriginRequest(request, appUrl)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Custom request not found." }, { status: 404 });
  }
  const access = await resolveAccess(id, principal);
  if (!access) return NextResponse.json({ error: "Custom request not found." }, { status: 404 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Message is too large." }, { status: 413 });
  }
  let raw: string;
  try {
    raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Message is too large." }, { status: 413 });
    }
  } catch {
    return NextResponse.json({ error: "Message could not be read." }, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Message request must contain valid JSON." }, { status: 400 });
  }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a message of up to 3,000 characters." }, { status: 400 });
  }

  try {
    await enforceAuthRateLimit({
      action: "custom-request-message",
      identifier: principal.id,
      clientAddress: request.headers.get("x-real-ip") ?? "unknown",
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    const prisma = getPrismaClient();
    const result = await prisma.$transaction(async (transaction) => {
      const created = await transaction.requestReply.create({
        data: { customRequestId: id, senderId: principal.id, body: parsed.data.body },
        select: { id: true, body: true, createdAt: true },
      });
      const recipientId =
        principal.role === UserRole.CUSTOMER
          ? access.assignedGuideId
            ? (await transaction.guideProfile.findUnique({
                where: { id: access.assignedGuideId },
                select: { userId: true },
              }))?.userId
            : undefined
          : access.customerId;
      if (recipientId) {
        await transaction.notification.create({
          data: {
            userId: recipientId,
            type: "REQUEST_UPDATE",
            title: "New message about a custom itinerary",
            body: "Sign in to your dashboard to read and reply.",
            data: { customRequestId: id },
          },
        });
      }
      await transaction.auditLog.create({
        data: {
          userId: principal.id,
          action: "custom_itinerary.message_sent",
          entity: "CustomRequest",
          entityId: id,
          metadata: { messageId: created.id },
        },
      });
      return created;
    });
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error(JSON.stringify({
      event: "custom_itinerary.message_create.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Message could not be sent." }, { status: 500 });
  }
}
