"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/button";

function splitList(value: string): string[] {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

export function CustomItineraryRequestForm() {
  const idempotencyKey = useRef<string | null>(null);
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const budget = String(form.get("budget") ?? "").trim();
    const body = {
      destinationText: String(form.get("destinationText") ?? ""),
      travelStartDate: String(form.get("travelStartDate") ?? "") || null,
      travelEndDate: String(form.get("travelEndDate") ?? "") || null,
      flexibleDates,
      travellerCount: Number(form.get("travellerCount")),
      budget: budget || null,
      budgetCurrency: budget ? "ZAR" : null,
      interests: splitList(String(form.get("interests") ?? "")),
      accommodationNeeded: form.get("accommodationNeeded") === "on",
      transportNeeded: form.get("transportNeeded") === "on",
      languages: splitList(String(form.get("languages") ?? "")),
      notes: String(form.get("notes") ?? ""),
    };
    try {
      const response = await fetch("/api/custom-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current ??= crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Your itinerary request could not be sent.");
        return;
      }
      setRequestId(result.request.id);
      setSubmitted(true);
      formElement.reset();
    } catch {
      setError("Your itinerary request could not be sent. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5" role="status">
        <h2 className="font-display text-xl font-semibold">Request received</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your custom itinerary request has been submitted for review. This is a request to book, not a confirmed booking; no payment or quote has been recorded yet.
        </p>
        {requestId ? <p className="mt-3 break-all text-xs text-muted-foreground">Request reference: {requestId}</p> : null}
      </div>
    );
  }

  return (
    <form className="grid gap-5" method="post" onSubmit={submitRequest}>
      <label className="grid gap-1.5 text-sm font-medium">
        Destination or area
        <input className="ui-input" maxLength={120} name="destinationText" required />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input checked={flexibleDates} onChange={(event) => setFlexibleDates(event.target.checked)} type="checkbox" />
        My dates are flexible
      </label>
      {!flexibleDates ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Travel start date
            <input className="ui-input" min={new Date().toISOString().slice(0, 10)} name="travelStartDate" required type="date" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Travel end date
            <input className="ui-input" min={new Date().toISOString().slice(0, 10)} name="travelEndDate" required type="date" />
          </label>
        </div>
      ) : null}
      <label className="grid gap-1.5 text-sm font-medium">
        Number of travellers
        <input className="ui-input" max={20} min={1} name="travellerCount" required type="number" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Budget (optional, ZAR)
        <input className="ui-input" min="0" name="budget" step="0.01" type="number" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Interests (comma-separated)
        <input className="ui-input" maxLength={600} name="interests" placeholder="Wildlife, food, culture" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Languages (comma-separated)
        <input className="ui-input" maxLength={300} name="languages" placeholder="English, isiXhosa" />
      </label>
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input name="accommodationNeeded" type="checkbox" />
          Accommodation needed
        </label>
        <label className="flex items-center gap-2">
          <input name="transportNeeded" type="checkbox" />
          Transport needed
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        Notes for the itinerary team
        <textarea className="ui-textarea min-h-28" maxLength={2000} name="notes" />
      </label>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <Button className="w-fit" disabled={saving} type="submit">
        {saving ? "Submitting request…" : "Submit request to book"}
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Submitting shares your trip details with Nomsa Tour Guides so the team can review your request. It does not confirm a booking or authorize payment.
      </p>
    </form>
  );
}
