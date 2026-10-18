"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { CustomRequestConversation } from "@/src/components/booking/custom-request-conversation";
import { formatCurrency, formatDate } from "@/src/lib/format";

type OfferSnapshot = {
  experienceTitle: string;
  experienceSlug: string;
  description?: string;
  destination: string;
  durationMinutes: number;
  meetingPoint: string | null;
  inclusions: string[];
  exclusions: string[];
  cancellationPolicy: string;
  currency: string;
};

type CustomerCustomRequest = {
  id: string;
  status: string;
  destinationText: string;
  travellerCount: number;
  travelStartDate: string | null;
  travelEndDate: string | null;
  flexibleDates: boolean;
  quotedAmount: string | null;
  quotedCurrency: string | null;
  offeredDate: string | null;
  offeredTimeSlot: string | null;
  offeredTravellerCount: number | null;
  offerSnapshot: OfferSnapshot | null;
  assignedGuide: { user: { name: string } } | null;
  booking: { id: string; status: string; paymentStatus: string } | null;
};

function beginPayFastCheckout(payload: { processUrl: string; fields: Record<string, string | number> }) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payload.processUrl;
  for (const [name, value] of Object.entries(payload.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export function CustomerCustomRequestCard({ request }: { request: CustomerCustomRequest }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const offerSnapshot = request.offerSnapshot;
  const canPay =
    request.status === "ACCEPTED" &&
    request.booking &&
    (request.booking.paymentStatus === "PENDING" ||
      request.booking.paymentStatus === "PROCESSING" ||
      request.booking.paymentStatus === "FAILED" ||
      request.booking.paymentStatus === "CANCELLED");

  async function respond(action: "accept" | "decline") {
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/custom-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your response could not be saved.");
      if (action === "accept") beginPayFastCheckout(result.payfast);
      else window.location.reload();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "Your response could not be saved.");
      setWorking(false);
    }
  }

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{request.destinationText}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {request.travellerCount} travellers · {request.flexibleDates
              ? "Flexible dates"
              : `${request.travelStartDate ? formatDate(request.travelStartDate) : "Date unavailable"} – ${request.travelEndDate ? formatDate(request.travelEndDate) : "Date unavailable"}`}
          </p>
        </div>
        <span className="rounded-full border border-border/70 px-3 py-1 text-xs font-semibold">
          {request.status.replaceAll("_", " ")}
        </span>
      </div>

      {request.status === "QUOTED" && offerSnapshot && request.quotedAmount ? (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Guide offer · review before paying</p>
          <Link className="mt-2 block font-semibold underline-offset-4 hover:underline" href={`/experiences/${offerSnapshot.experienceSlug}`}>
            {offerSnapshot.experienceTitle}
          </Link>
          {offerSnapshot.description ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
              {offerSnapshot.description}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">A description was not saved with this offer.</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {offerSnapshot.destination} · {request.offeredDate ? formatDate(request.offeredDate) : "Date not available"} · {request.offeredTimeSlot ?? "Time not available"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.offeredTravellerCount ?? request.travellerCount} travellers · {Math.floor(offerSnapshot.durationMinutes / 60)}h{offerSnapshot.durationMinutes % 60 ? ` ${offerSnapshot.durationMinutes % 60}m` : ""}
          </p>
          {offerSnapshot.meetingPoint ? (
            <p className="mt-2 text-sm"><span className="font-medium">Meeting point:</span> {offerSnapshot.meetingPoint}</p>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold">Included</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {offerSnapshot.inclusions.length ? offerSnapshot.inclusions.join(", ") : "No inclusions listed"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold">Not included</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {offerSnapshot.exclusions.length ? offerSnapshot.exclusions.join(", ") : "No exclusions listed"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Cancellation terms:</span> {offerSnapshot.cancellationPolicy}
          </p>
          <p className="mt-4 font-display text-xl font-semibold">
            {formatCurrency(Number(request.quotedAmount), request.quotedCurrency || offerSnapshot.currency)} total
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accepting creates a pending booking. Payment is confirmed only after PayFast verifies it.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={working} onClick={() => void respond("accept")} type="button">
              {working ? "Processing…" : "Accept offer and continue to payment"}
            </Button>
            <Button disabled={working} onClick={() => void respond("decline")} type="button" variant="outline">
              Decline offer
            </Button>
          </div>
        </div>
      ) : null}

      {request.status === "ACCEPTED" ? (
        <div className="mt-4 rounded-xl border border-border/60 bg-background p-4">
          <p className="text-sm font-semibold">Offer accepted · payment {request.booking?.paymentStatus?.toLowerCase().replaceAll("_", " ") ?? "not started"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {request.booking?.paymentStatus === "SUCCEEDED"
              ? "PayFast confirmed the payment."
              : "The booking is not confirmed until PayFast reports successful payment."}
          </p>
          {canPay ? (
            <Button className="mt-3" disabled={working} onClick={() => void respond("accept")} size="sm" type="button">
              {request.booking?.paymentStatus === "FAILED" || request.booking?.paymentStatus === "CANCELLED"
                ? "Retry payment"
                : "Continue payment"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {request.status === "BOOKED" ? (
        <p className="mt-4 rounded-xl border border-success/20 bg-success/5 p-3 text-sm">
          Payment recorded and booking confirmed.
        </p>
      ) : null}
      {request.assignedGuide ? (
        <p className="mt-3 text-xs text-muted-foreground">Assigned guide: {request.assignedGuide.user.name}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
      <CustomRequestConversation requestId={request.id} />
    </li>
  );
}
