import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnvironment } from "@/src/config/env";
import { getCurrentUser } from "@/src/lib/auth/session";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import { submitBookingReview, ReviewSubmissionError } from "@/src/server/services/review-service";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().trim().min(20).max(2000),
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
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Review request must contain valid JSON." }, { status: 400 });
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a rating from 1 to 5 and write between 20 and 2,000 characters." },
      { status: 400 },
    );
  }

  try {
    const review = await submitBookingReview(
      principal,
      id,
      parsed.data.rating,
      parsed.data.reviewText,
    );
    return NextResponse.json({ review }, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ReviewSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "booking.review_submission.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Review could not be submitted." }, { status: 500 });
  }
}
