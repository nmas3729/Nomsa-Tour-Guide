"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Lock,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Container } from "@/src/components/layout/container";
import { Section } from "@/src/components/layout/section";
import { formatCurrency } from "@/src/lib/format";
import { guides } from "@/src/data/public-site";
import type { ExperienceDetailData } from "@/src/data/experience-details";
import { cn } from "@/src/lib/utils";

const availableTimeSlots = [
  { id: "morning", time: "09:00 AM – 11:30 AM", label: "Morning Light" },
  { id: "afternoon", time: "02:00 PM – 04:30 PM", label: "Golden Afternoon" },
];

export function BookingFlow({
  experience,
  minimumBookingDate,
  initialDate,
  initialGuestCount,
  searchQuery,
}: {
  experience: ExperienceDetailData;
  minimumBookingDate: string;
  initialDate: string;
  initialGuestCount: number;
  searchQuery: string;
}) {
  const idempotencyKey = useRef<string | null>(null);
  const dateFormRef = useRef<HTMLFormElement>(null);
  const travellerFormRef = useRef<HTMLFormElement>(null);
  // Step state (1: Date & Time, 2: Travellers, 3: Review, 4: Payment, 5: Success)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1 State: Dates & Time & Guests
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedSlot, setSelectedSlot] = useState<string>("morning");
  const [adultsCount, setAdultsCount] = useState<number>(initialGuestCount);
  const [childrenCount, setChildrenCount] = useState<number>(0);

  // Step 2 State: Traveller Details
  const [leadFirstName, setLeadFirstName] = useState("");
  const [leadLastName, setLeadLastName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadCountry, setLeadCountry] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [dietaryRequirements, setDietaryRequirements] = useState("None");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payfastError, setPayfastError] = useState("");

  const guide = experience.guideProfile ??
    (experience.guideSlug ? guides.find((candidate) => candidate.slug === experience.guideSlug) : undefined);
  const totalGuests = adultsCount + childrenCount;

  const baseRate = experience.price * totalGuests;
  const grandTotal = baseRate;
  const cancellationTerms =
    experience.cancellationPolicy || "No cancellation policy was provided for this experience.";

  function continueFromDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCurrentStep(2);
  }

  function continueFromTravellerDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCurrentStep(3);
  }

  async function handlePayFastCheckout() {
    setIsSubmitting(true);
    setPayfastError("");

    try {
      idempotencyKey.current ??= crypto.randomUUID();
      const bookingInput = {
        experienceSlug: experience.slug,
        date: selectedDate,
        timeSlot: selectedSlot === "morning" ? "09:00 AM" : "02:00 PM",
        adultsCount,
        childrenCount,
        leadTraveller: {
          firstName: leadFirstName,
          lastName: leadLastName,
          email: leadEmail,
          phone: leadPhone,
          country: leadCountry,
        },
        emergencyContact: {
          name: emergencyName,
          phone: emergencyPhone,
        },
        dietary: dietaryRequirements,
        accessibility: accessibilityNeeds,
        specialRequests,
      };
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify(bookingInput),
      });

      if (!res.ok) {
        const result = await res.json();
        if (res.status < 500) {
          idempotencyKey.current = null;
        }
        throw new Error(
          typeof result.error === "string" ? result.error : "Booking could not be created. Please try again.",
        );
      }

      const data = await res.json();
      const { payfast } = data;

      // Real PayFast form POST redirect
      const form = document.createElement("form");
      form.method = "POST";
      form.action = payfast.processUrl;

      Object.entries(payfast.fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setPayfastError(err instanceof Error ? err.message : "Payment initialization failed.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-background text-foreground">
      {/* Progress Header */}
      <div className="border-b border-border/70 bg-card py-4">
        <Container>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              href={`/experiences/${experience.slug}${searchQuery ? `?${searchQuery}` : ""}`}
            >
              <ArrowLeft size={15} />
              <span>Back to experience</span>
            </Link>

            {/* 4-Step Indicator */}
            <nav aria-label="Booking steps" className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
              {[
                { step: 1, title: "Date & Time" },
                { step: 2, title: "Travellers" },
                { step: 3, title: "Review" },
                { step: 4, title: "Payment" },
              ].map((s) => (
                <div className="flex items-center gap-2" key={s.step}>
                  <button
                    aria-current={currentStep === s.step ? "step" : undefined}
                    aria-label={`Step ${s.step}: ${s.title}`}
                    className={cn(
                      "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
                      currentStep === s.step
                        ? "bg-primary text-white font-bold"
                        : currentStep > s.step
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground",
                    )}
                    disabled={s.step >= currentStep}
                    onClick={() => {
                      if (s.step < currentStep) setCurrentStep(s.step);
                    }}
                    type="button"
                  >
                    <span>{s.step}</span>
                    <span className="hidden md:inline">{s.title}</span>
                  </button>
                  {s.step < 4 ? <span className="text-border">/</span> : null}
                </div>
              ))}
            </nav>
          </div>
        </Container>
      </div>

      {/* Main Booking Content & Sticky Sidebar */}
      <Section className="py-8 sm:py-12">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            {/* Left 7 Columns: Step Content */}
            <div className="space-y-8 lg:col-span-7">
              {/* STEP 1: Date, Time & Guests */}
              {currentStep === 1 && (
                <form className="space-y-8" method="post" onSubmit={continueFromDate} ref={dateFormRef}>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Step 1 of 4</span>
                    <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                      Choose Date & Departure
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Select your preferred departure day and morning or afternoon time slot.
                    </p>
                  </div>

                  {/* Calendar Input & Slots */}
                  <div className="glass-panel glass-panel--subtle rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-7">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor="calendar-date">
                      Select Travel Date
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-primary" />
                        <input
                          className="ui-input pl-12 text-sm font-semibold"
                          id="calendar-date"
                          min={minimumBookingDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          required
                          type="date"
                          value={selectedDate}
                        />
                      </div>
                    </div>

                    {/* Time Slot Selection */}
                    <div className="mt-6">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-3">
                        Departure times for {selectedDate}
                      </span>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Live capacity is checked when you continue to booking.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {availableTimeSlots.map((slot) => (
                          <button
                            aria-pressed={selectedSlot === slot.id}
                            className={cn(
                              "relative rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              selectedSlot === slot.id
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                : "border-border/80 bg-background hover:border-primary/40",
                            )}
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot.id)}
                            type="button"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-primary">{slot.label}</span>
                            </div>
                            <p className="mt-2 font-display text-base font-semibold">{slot.time}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin size={11} /> {experience.meetingPoint?.name ?? "Meeting details not listed"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Guests Counters */}
                    <div className="mt-8 border-t border-border/60 pt-6">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-4">
                        Number of Travellers
                      </span>
                      <div className="space-y-4">
                        {/* Adults */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Adults</p>
                            <p className="text-xs text-muted-foreground">Age 13+</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              aria-label="Decrease adults"
                              className="size-11 rounded-full border border-border bg-card text-foreground font-bold hover:bg-muted disabled:opacity-40"
                              disabled={adultsCount <= 1}
                              onClick={() => setAdultsCount(adultsCount - 1)}
                              type="button"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{adultsCount}</span>
                            <button
                              aria-label="Increase adults"
                              className="size-11 rounded-full border border-border bg-card text-foreground font-bold hover:bg-muted disabled:opacity-40"
                              disabled={totalGuests >= 10}
                              onClick={() => setAdultsCount(adultsCount + 1)}
                              type="button"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Children */}
                        <div className="flex items-center justify-between border-t border-border/40 pt-4">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Children</p>
                            <p className="text-xs text-muted-foreground">Ages 4–12</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              aria-label="Decrease children"
                              className="size-11 rounded-full border border-border bg-card text-foreground font-bold hover:bg-muted disabled:opacity-40"
                              disabled={childrenCount <= 0}
                              onClick={() => setChildrenCount(childrenCount - 1)}
                              type="button"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{childrenCount}</span>
                            <button
                              aria-label="Increase children"
                              className="size-11 rounded-full border border-border bg-card text-foreground font-bold hover:bg-muted disabled:opacity-40"
                              disabled={totalGuests >= 10}
                              onClick={() => setChildrenCount(childrenCount + 1)}
                              type="button"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {totalGuests >= 10 ? (
                        <p className="mt-3 text-xs text-highlight font-medium">
                          Maximum group size is 10 guests to ensure intimacy and quality.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    className="w-full sm:w-auto h-12 px-8 font-semibold"
                    type="submit"
                  >
                    <span>Continue to Traveller Details</span>
                    <ArrowRight size={16} />
                  </Button>
                </form>
              )}

              {/* STEP 2: Traveller Details */}
              {currentStep === 2 && (
                <form className="space-y-8" method="post" onSubmit={continueFromTravellerDetails} ref={travellerFormRef}>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Step 2 of 4</span>
                    <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                      Lead Traveller & Guests
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      We need primary contact details for confirmation and safety registration.
                    </p>
                  </div>

                  {/* Form */}
                  <div className="glass-panel glass-panel--subtle rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-7 space-y-6">
                    <h3 className="font-display text-lg font-semibold text-foreground">Lead Traveller</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5" htmlFor="first-name">
                          First Name
                        </label>
                        <input
                          className="ui-input text-xs"
                          id="first-name"
                          onChange={(e) => setLeadFirstName(e.target.value)}
                          required
                          value={leadFirstName}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5" htmlFor="last-name">
                          Last Name
                        </label>
                        <input
                          className="ui-input text-xs"
                          id="last-name"
                          onChange={(e) => setLeadLastName(e.target.value)}
                          required
                          value={leadLastName}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5" htmlFor="email">
                          Email Address
                        </label>
                        <input
                          className="ui-input text-xs"
                          id="email"
                          onChange={(e) => setLeadEmail(e.target.value)}
                          required
                          type="email"
                          value={leadEmail}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5" htmlFor="phone">
                          Phone Number (WhatsApp)
                        </label>
                        <input
                          className="ui-input text-xs"
                          id="phone"
                          onChange={(e) => setLeadPhone(e.target.value)}
                          required
                          value={leadPhone}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5" htmlFor="country">
                        Country of Residence
                      </label>
                      <input
                        className="ui-input text-xs"
                        id="country"
                        onChange={(e) => setLeadCountry(e.target.value)}
                        required
                        value={leadCountry}
                      />
                    </div>

                    {/* Emergency Contact */}
                    <div className="border-t border-border/60 pt-6">
                      <h3 className="font-display text-lg font-semibold text-foreground">Emergency Contact</h3>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5" htmlFor="emerg-name">
                            Contact Full Name
                          </label>
                          <input
                            className="ui-input text-xs"
                            id="emerg-name"
                            onChange={(e) => setEmergencyName(e.target.value)}
                            required
                            value={emergencyName}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5" htmlFor="emerg-phone">
                            Contact Phone
                          </label>
                          <input
                            className="ui-input text-xs"
                            id="emerg-phone"
                            onChange={(e) => setEmergencyPhone(e.target.value)}
                            required
                            value={emergencyPhone}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preferences & Dietary */}
                    <div className="border-t border-border/60 pt-6 space-y-4">
                      <h3 className="font-display text-lg font-semibold text-foreground">Preferences & Dietary</h3>
                      <div>
                        <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5" htmlFor="dietary">
                          Dietary Requirements
                        </label>
                        <select
                          className="ui-select text-xs"
                          id="dietary"
                          onChange={(e) => setDietaryRequirements(e.target.value)}
                          value={dietaryRequirements}
                        >
                          <option value="None">None (Omnivore)</option>
                          <option value="Vegetarian">Vegetarian</option>
                          <option value="Vegan">Vegan</option>
                          <option value="Halal">Strict Halal</option>
                          <option value="GlutenFree">Gluten-Free</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer pt-2">
                        <input
                          checked={accessibilityNeeds}
                          className="size-4 rounded border-border text-primary"
                          onChange={(e) => setAccessibilityNeeds(e.target.checked)}
                          type="checkbox"
                        />
                        <span>A member of our group requires physical accessibility or mobility assistance</span>
                      </label>

                      <div>
                        <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5" htmlFor="special-requests">
                          Notes or Special Occasions (Optional)
                        </label>
                        <textarea
                          className="ui-textarea text-xs min-h-24"
                          id="special-requests"
                          onChange={(e) => setSpecialRequests(e.target.value)}
                          placeholder="Celebrating an anniversary, photography interests, etc."
                          value={specialRequests}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={() => setCurrentStep(1)} type="button" variant="outline">
                      <ArrowLeft size={16} /> Back
                    </Button>
                    <Button
                      className="flex-1 sm:flex-initial h-12 px-8 font-semibold"
                      type="submit"
                    >
                      <span>Review Booking Summary</span>
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    We use these details to process your booking request. Read our{" "}
                    <Link className="font-semibold text-primary underline underline-offset-4" href="/privacy">
                      Privacy Notice
                    </Link>.
                  </p>
                </form>
              )}

              {/* STEP 3: Booking Summary Review */}
              {currentStep === 3 && (
                <div className="space-y-8">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Step 3 of 4</span>
                    <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                      Review Reservation
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Please verify all details before continuing to payment.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="glass-panel glass-panel--subtle rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-7 space-y-6">
                    <div className="flex items-start gap-4 border-b border-border/60 pb-6">
                      <div className="relative isolate size-20 overflow-hidden rounded-2xl bg-muted shrink-0">
                        {experience.images[0] ? (
                          <Image
                            alt={experience.images[0].caption || experience.title}
                            className="object-cover"
                            fill
                            src={experience.images[0].url}
                          />
                        ) : null}
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase text-primary tracking-wider">
                          {experience.category}
                        </span>
                        <h3 className="font-display text-lg font-semibold leading-snug">{experience.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          <MapPin size={12} className="inline mr-1" />
                          {experience.destination}, {experience.province}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Data Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 text-xs">
                      <div>
                        <span className="text-muted-foreground uppercase font-semibold block">Date & Departure</span>
                        <span className="font-medium text-foreground text-sm">
                          {selectedDate} ({selectedSlot === "morning" ? "09:00 AM" : "02:00 PM"})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase font-semibold block">Travellers</span>
                        <span className="font-medium text-foreground text-sm">
                          {totalGuests} guests ({adultsCount} adults{childrenCount > 0 ? `, ${childrenCount} kids` : ""})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase font-semibold block">Lead Traveller</span>
                        <span className="font-medium text-foreground text-sm">
                          {leadFirstName} {leadLastName} ({leadEmail})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase font-semibold block">Meeting Point</span>
                        <span className="font-medium text-foreground text-sm truncate block">
                          {experience.meetingPoint?.name ?? "Not listed"}
                        </span>
                      </div>
                    </div>

                    {/* Host details */}
                    {guide ? (
                      <div className="rounded-2xl bg-primary/10 p-4 text-xs flex items-center gap-3 text-foreground">
                        <Avatar className="size-10 shrink-0 border border-primary/20">
                          {guide.image ? <AvatarImage alt={guide.name} src={guide.image} /> : null}
                          <AvatarFallback>{guide.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">Hosted by {guide.name}</p>
                          <p className="text-muted-foreground">
                            {guide.location} · {guide.yearsExperience} years guiding
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-secondary/40 p-4 text-xs text-muted-foreground">
                        Guide profile details are not listed for this experience yet.
                      </p>
                    )}

                    <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
                      <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-foreground block">Cancellation terms (saved with your booking)</strong>
                        <span>{cancellationTerms}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={() => setCurrentStep(2)} variant="outline">
                      <ArrowLeft size={16} /> Back
                    </Button>
                    <Button
                      className="flex-1 sm:flex-initial h-12 px-8 font-semibold bg-accent text-white hover:bg-accent/90"
                      onClick={() => setCurrentStep(4)}
                    >
                      <span>Proceed to Payment</span>
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: Payment */}
              {currentStep === 4 && (
                <div className="space-y-8">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Step 4 of 4</span>
                    <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                      Continue to PayFast checkout
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      You&apos;ll be redirected to PayFast to enter your payment details after reviewing this booking.
                    </p>
                  </div>
                  <p className="rounded-2xl border border-border/70 bg-secondary/30 p-4 text-sm text-muted-foreground">
                    Instant booking for a fixed experience. Your booking is confirmed only after PayFast records a successful payment.
                  </p>

                  {/* Payment Gateway Box */}
                  <div className="glass-panel glass-panel--subtle rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-7 space-y-6">
                    <div className="flex items-center justify-between border-b border-border/60 pb-4">
                      <div className="flex items-center gap-2">
                        <Lock size={16} className="text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          PayFast checkout
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary">PayFast ZA</span>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                      <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                      <p>
                        Card and payment details are entered directly on PayFast. Nomsa does not ask you to enter card details here.
                      </p>
                    </div>
                  </div>

                  {payfastError ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                      {payfastError}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button onClick={() => setCurrentStep(3)} variant="outline">
                      <ArrowLeft size={16} /> Back
                    </Button>
                    <Button
                      className="flex-1 h-13 px-8 rounded-full font-bold text-base bg-accent text-white shadow-xl shadow-accent/25 hover:bg-accent/90"
                      disabled={isSubmitting}
                      onClick={handlePayFastCheckout}
                    >
                      {isSubmitting ? "Connecting to PayFast..." : `Pay with PayFast (${formatCurrency(grandTotal)})`}
                    </Button>
                  </div>

                </div>
              )}
            </div>

            {/* Right 5 Columns: Desktop Sticky Booking Sidebar */}
            <aside className="lg:col-span-5">
              <div className="glass-panel glass-panel--floating sticky top-28 rounded-3xl border border-border/80 bg-card p-7 shadow-xl shadow-black/5 dark:shadow-none space-y-6">
                {/* Header Summary */}
                <div className="flex gap-4 border-b border-border/60 pb-5">
                  <div className="relative isolate size-16 rounded-2xl overflow-hidden bg-muted shrink-0">
                    {experience.images[0] ? (
                      <Image
                        alt={experience.images[0].caption || experience.title}
                        className="object-cover"
                        fill
                        src={experience.images[0].url}
                      />
                    ) : null}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold line-clamp-1">{experience.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <MapPin size={11} className="inline mr-1" />
                      {experience.destination} · {experience.duration}
                    </p>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 text-xs border-b border-border/60 pb-5">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground block">
                    Price Breakdown
                  </span>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {formatCurrency(experience.price)} × {totalGuests} {totalGuests === 1 ? "guest" : "guests"}
                    </span>
                    <span className="font-medium text-foreground">{formatCurrency(baseRate)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Optional extras</span>
                    <span className="text-foreground">Not offered / not included</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Transport</span>
                    <span className="text-foreground">Not included</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Separate platform fee</span>
                    <span className="text-foreground">None recorded</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxes</span>
                    <span className="text-foreground">Not calculated / not included</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-muted-foreground block">Total Amount</span>
                    <span className="text-xs text-muted-foreground">South African Rand (ZAR)</span>
                  </div>
                  <span className="font-display text-3xl font-bold text-primary">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                {/* Booking details */}
                <div className="space-y-2.5 rounded-2xl bg-secondary/40 p-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-primary shrink-0" />
                    <span>{cancellationTerms}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-primary shrink-0" />
                    <span>Payment continues through PayFast checkout</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      {/* Mobile Sticky Booking Bar (One-handed checkout) */}
      <div className="sticky bottom-0 z-40 flex items-center justify-between border-t border-border/80 bg-background/95 px-5 py-3.5 backdrop-blur-xl lg:hidden">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total ({totalGuests} guests)</span>
          <span className="font-display text-xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
        </div>
        <Button
          className="h-11 px-6 font-semibold bg-accent text-white"
          disabled={isSubmitting}
          onClick={() => {
            if (currentStep === 1) dateFormRef.current?.requestSubmit();
            else if (currentStep === 2) travellerFormRef.current?.requestSubmit();
            else if (currentStep === 3) setCurrentStep(4);
            else handlePayFastCheckout();
          }}
          size="sm"
        >
          {isSubmitting ? "Connecting..." : currentStep === 4 ? "Pay with PayFast" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
