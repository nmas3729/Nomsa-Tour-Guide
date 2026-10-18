import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import {
  getGuideReviewQueues,
  GuideOnboardingError,
} from "@/src/server/services/guide-review-service";

export async function GET() {
  const principal = await getCurrentUser();
  if (!principal) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    const queues = await getGuideReviewQueues(principal);
    return NextResponse.json(
      queues,
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof GuideOnboardingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    console.error(JSON.stringify({
      event: "guide.review_queue.read_failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { error: "Guide review queues could not be loaded." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
