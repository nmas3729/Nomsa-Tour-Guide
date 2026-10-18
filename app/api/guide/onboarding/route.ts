import { NextResponse } from "next/server";
import { guideOnboardingSchema } from "@/src/features/auth/guide-onboarding-schema";
import { getServerEnvironment } from "@/src/config/env";
import { GuideApplicationStatus } from "@/src/server/db/generated/enums";
import { getCurrentUser } from "@/src/lib/auth/session";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import {
  getGuideOnboardingData,
  GuideOnboardingError,
  saveGuideOnboarding,
} from "@/src/server/services/guide-onboarding-service";
import { sendGuideApplicationReviewEmail } from "@/src/features/auth/services/guide-application-email";

export async function GET() {
  const principal = await getCurrentUser();
  if (!principal) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  try {
    const onboarding = await getGuideOnboardingData(principal);
    return NextResponse.json(
      { onboarding },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof GuideOnboardingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "guide.onboarding.read_failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Guide onboarding could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const principal = await getCurrentUser();
  if (!principal) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const appUrl = getServerEnvironment().NEXT_PUBLIC_APP_URL;
  if (!appUrl || !isSameOriginRequest(request, appUrl)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must contain valid JSON." }, { status: 400 });
  }
  const parsed = guideOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Onboarding details are invalid.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  try {
    const result = await saveGuideOnboarding(principal, parsed.data);
    let reviewEmailSent = false;
    if (result.notification) {
      try {
        await sendGuideApplicationReviewEmail({
          ...result.notification,
          status: GuideApplicationStatus.SUBMITTED,
        });
        reviewEmailSent = true;
      } catch (error) {
        console.error(JSON.stringify({
          event: "guide.application_review_email.failed",
          errorName: error instanceof Error ? error.name : "UnknownError",
        }));
      }
    }
    return NextResponse.json(
      {
        application: result.application,
        reviewEmailSent,
        message: result.notification
          ? reviewEmailSent
            ? "Your onboarding has been submitted for manual review."
            : "Your onboarding was submitted, but the review inbox notification could not be confirmed."
          : "Your draft has been saved.",
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof GuideOnboardingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "guide.onboarding.save_failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Guide onboarding could not be saved." }, { status: 500 });
  }
}
