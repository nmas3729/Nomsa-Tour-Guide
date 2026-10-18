"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";

type PendingReview = {
  id: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  experience: { title: string };
};

export function AdminReviewModeration() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/reviews", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Review queue could not be loaded.");
      setReviews(result.reviews);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Review queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/reviews", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Review queue could not be loaded.");
        return result;
      })
      .then((result) => {
        if (!active) return;
        setReviews(result.reviews);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Review queue could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function decide(reviewId: string, status: "APPROVED" | "REJECTED") {
    setWorkingId(reviewId);
    setError("");
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Review decision could not be recorded.");
      await loadReviews();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Review decision could not be recorded.");
    } finally {
      setWorkingId("");
    }
  }

  return (
    <section aria-label="Review moderation" className="mt-8 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold">Review moderation</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Only reviews explicitly approved here are displayed publicly. Each review must relate to a completed booking.
      </p>
      {loading ? <p className="mt-4 text-sm text-muted-foreground" role="status">Loading pending reviews…</p> : null}
      {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}
      {!loading && !reviews.length && !error ? (
        <p className="mt-4 text-sm text-muted-foreground">No reviews are awaiting moderation.</p>
      ) : null}
      {reviews.length ? (
        <ul className="mt-4 grid gap-3">
          {reviews.map((review) => (
            <li className="rounded-xl border border-border/60 p-4" key={review.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{review.experience.title}</p>
                <span className="text-xs font-semibold">{review.rating} / 5</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{review.reviewText}</p>
              <time className="mt-2 block text-[11px] text-muted-foreground" dateTime={review.createdAt}>
                Submitted {new Date(review.createdAt).toLocaleDateString()}
              </time>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button disabled={workingId === review.id} onClick={() => void decide(review.id, "APPROVED")} size="sm">
                  Approve public review
                </Button>
                <Button
                  disabled={workingId === review.id}
                  onClick={() => void decide(review.id, "REJECTED")}
                  size="sm"
                  variant="outline"
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
