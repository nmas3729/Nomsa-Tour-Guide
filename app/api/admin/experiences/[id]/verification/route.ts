import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnvironment } from "@/src/config/env";
import { GuideApplicationStatus } from "@/src/server/db/generated/enums";
import { getCurrentUser } from "@/src/lib/auth/session";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import {
  GuideOnboardingError,
  reviewExperience,
} from "@/src/server/services/guide-review-service";

const decisionSchema = z.object({
  status: z.enum([
    GuideApplicationStatus.DRAFT,
    GuideApplicationStatus.SUBMITTED,
    GuideApplicationStatus.CHANGES_REQUESTED,
    GuideApplicationStatus.APPROVED,
    GuideApplicationStatus.SUSPENDED,
    GuideApplicationStatus.REJECTED,
  ]),
  notes: z.string().trim().max(2000).default(""),
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
    return NextResponse.json({ error: "Experience not found." }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must contain valid JSON." }, { status: 400 });
  }
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Review decision is invalid." }, { status: 400 });
  }
  try {
    const result = await reviewExperience(principal, id, parsed.data.status, parsed.data.notes);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof GuideOnboardingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "experience.verification_review.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Experience review could not be recorded." }, { status: 500 });
  }
}
