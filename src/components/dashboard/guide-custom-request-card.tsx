"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/button";
import { CustomRequestConversation } from "@/src/components/booking/custom-request-conversation";
import { formatCurrency, formatDate } from "@/src/lib/format";

type OfferableExperience = {
  id: string;
  title: string;
  currency: string;
  minGuests: number;
  maxGuests: number;
  price: string;
  availability: Array<{ date: string; timeSlot: string; remainingCapacity: number }>;
};

type GuideRequest = {
  id: string;
  destinationText: string;
  travelStartDate: string | null;
  travelEndDate: string | null;
  flexibleDates: boolean;
  travellerCount: number;
  budget: string | null;
  budgetCurrency: string | null;
  interests: string[];
  languages: string[];
  accommodationNeeded: boolean;
  transportNeeded: boolean;
  notes: string | null;
  status: string;
  quotedAmount: string | null;
  quotedCurrency: string | null;
  offeredDate: string | null;
  offeredTimeSlot: string | null;
  offeredTravellerCount: number | null;
  offerVersion: number;
  customer: { name: string };
  offeredExperience: { id: string; title: string } | null;
};

export function GuideCustomRequestCard({
  request,
  experiences,
}: {
  request: GuideRequest;
  experiences: OfferableExperience[];
}) {
  const startingExperienceId =
    request.offeredExperience?.id ??
    experiences.find((experience) => experience.availability.length)?.id ??
    "";
  const [experienceId, setExperienceId] = useState(startingExperienceId);
  const selectedExperience = experiences.find((experience) => experience.id === experienceId);
  const [date, setDate] = useState(request.offeredDate ?? "");
  const [timeSlot, setTimeSlot] = useState(request.offeredTimeSlot || "09:00 AM");
  const [travellerCount, setTravellerCount] = useState(request.offeredTravellerCount ?? request.travellerCount);
  const [amount, setAmount] = useState(request.quotedAmount ?? "");
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const availableDates = useMemo(
    () => [...new Set(selectedExperience?.availability.map((slot) => slot.date) ?? [])],
    [selectedExperience],
  );
  const slotsForDate = selectedExperience?.availability.filter((slot) => slot.date === date) ?? [];
  const availableTimeSlots = ["09:00 AM", "02:00 PM"].filter((slot) =>
    slotsForDate.some(
      (availability) =>
        (availability.timeSlot === slot || availability.timeSlot === "ALL_DAY") &&
        availability.remainingCapacity >= travellerCount,
    ),
  );

  function selectExperience(nextId: string) {
    setExperienceId(nextId);
    const nextExperience = experiences.find((experience) => experience.id === nextId);
    setDate(nextExperience?.availability[0]?.date ?? "");
  }

  async function respond(body: Record<string, unknown>) {
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/custom-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The request response could not be saved.");
      window.location.reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The request response could not be saved.");
      setWorking(false);
    }
  }

  function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExperience) {
      setError("Choose an approved experience with availability.");
      return;
    }
    void respond({
      action: "offer",
      experienceId,
      date,
      timeSlot,
      travellerCount,
      amount,
    });
  }

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{request.destinationText}</p>
          <p className="mt-1 text-xs text-muted-foreground">Traveller: {request.customer.name} · {request.travellerCount} travellers</p>
        </div>
        <span className="rounded-full border border-border/70 px-3 py-1 text-xs font-semibold">
          {request.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {request.flexibleDates
          ? "Flexible travel dates"
          : `${request.travelStartDate ? formatDate(request.travelStartDate) : "Date unavailable"} – ${request.travelEndDate ? formatDate(request.travelEndDate) : "Date unavailable"}`}
        {request.budget ? ` · Traveller budget ${formatCurrency(Number(request.budget), request.budgetCurrency || "ZAR")}` : ""}
      </p>
      {request.interests.length ? <p className="mt-2 text-sm"><span className="font-medium">Interests:</span> {request.interests.join(", ")}</p> : null}
      {request.languages.length ? <p className="mt-1 text-sm"><span className="font-medium">Languages:</span> {request.languages.join(", ")}</p> : null}
      <p className="mt-1 text-xs text-muted-foreground">
        {request.accommodationNeeded ? "Accommodation requested" : "No accommodation requested"} · {request.transportNeeded ? "Transport requested" : "No transport requested"}
      </p>
      {request.notes ? <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{request.notes}</p> : null}

      {request.status === "ASSIGNED" || request.status === "QUOTED" ? (
        <form className="mt-4 grid gap-3 rounded-xl border border-border/60 bg-background/70 p-4" method="post" onSubmit={submitOffer}>
          <p className="text-sm font-semibold">
            {request.status === "QUOTED" ? `Offer v${request.offerVersion} · ${request.offeredExperience?.title ?? "Previously quoted"}` : "Prepare your offer"}
          </p>
          <label className="grid gap-1 text-xs font-medium">
            Approved experience
            <select
              className="ui-input"
              onChange={(event) => selectExperience(event.target.value)}
              required
              value={experienceId}
            >
              <option value="">Choose an experience</option>
              {experiences.map((experience) => (
                <option disabled={!experience.availability.length} key={experience.id} value={experience.id}>
                  {experience.title} · {experience.currency} · max {experience.maxGuests}
                </option>
              ))}
            </select>
          </label>
          {selectedExperience && selectedExperience.availability.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium">
                Offered date
                <select className="ui-input" onChange={(event) => setDate(event.target.value)} required value={date}>
                  <option value="">Choose an available date</option>
                  {availableDates.map((availableDate) => <option key={availableDate} value={availableDate}>{formatDate(availableDate)}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Time
                <select className="ui-input" onChange={(event) => setTimeSlot(event.target.value)} required value={timeSlot}>
                  {availableTimeSlots.length ? availableTimeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>) : <option value="">No remaining capacity at this group size</option>}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Travellers
                <input
                  className="ui-input"
                  max={selectedExperience.maxGuests}
                  min={selectedExperience.minGuests}
                  onChange={(event) => setTravellerCount(Number(event.target.value))}
                  required
                  type="number"
                  value={travellerCount}
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Final total price ({selectedExperience.currency})
                <input
                  className="ui-input"
                  min="0.01"
                  onChange={(event) => setAmount(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={amount}
                />
              </label>
            </div>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            The traveller reviews the selected date, group size, total price, inclusions, exclusions, and cancellation terms before accepting. The price above is the total for the trip.
          </p>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button disabled={working || !selectedExperience || !availableTimeSlots.length} size="sm" type="submit">
              {working ? "Saving…" : request.status === "QUOTED" ? "Update offer" : "Send offer"}
            </Button>
            <Button
              disabled={working}
              onClick={() => void respond({ action: "decline", reason })}
              size="sm"
              type="button"
              variant="outline"
            >
              Decline request
            </Button>
          </div>
          <label className="grid gap-1 text-xs font-medium">
            Decline reason (optional)
            <input className="ui-input" maxLength={500} onChange={(event) => setReason(event.target.value)} value={reason} />
          </label>
        </form>
      ) : null}
      <CustomRequestConversation requestId={request.id} />
    </li>
  );
}
