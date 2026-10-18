import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import {
  getReviewModerationQueue,
  ReviewSubmissionError,
} from "@/src/server/services/review-service";

export async function GET() {
  const principal = await getCurrentUser();
  if (!principal) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    const reviews = await getReviewModerationQueue(principal);
    return NextResponse.json(
      { reviews },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof ReviewSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "review.moderation_queue.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Review queue is temporarily unavailable." }, { status: 500 });
  }
}
