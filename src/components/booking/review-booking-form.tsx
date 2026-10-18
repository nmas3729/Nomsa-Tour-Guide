"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/button";

export function ReviewBookingForm({ bookingId }: { bookingId: string }) {
  const [rating, setRating] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: Number(rating), reviewText }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Review could not be submitted.");
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Review could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm" role="status">
        Review submitted. It will appear publicly only after moderation.
      </p>
    );
  }

  return (
    <form className="grid gap-3 rounded-xl border border-border/60 bg-background/70 p-4" method="post" onSubmit={submit}>
      <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <label className="grid gap-1 text-xs font-medium">
          Rating
          <select
            className="ui-input"
            onChange={(event) => setRating(event.target.value)}
            required
            value={rating}
          >
            <option value="">Choose a rating</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>{value} out of 5</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Your experience
          <textarea
            className="ui-textarea min-h-20"
            maxLength={2000}
            minLength={20}
            onChange={(event) => setReviewText(event.target.value)}
            required
            value={reviewText}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <Button className="w-fit" disabled={submitting} size="sm" type="submit">
        {submitting ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
