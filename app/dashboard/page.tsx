import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, Compass, Heart, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { BookingCard } from "@/src/components/cards/booking-card";
import { AdminFinancialTools } from "@/src/components/dashboard/admin-financial-tools";
import { AdminGuideReview } from "@/src/components/dashboard/admin-guide-review";
import { AdminCustomRequestAssignment } from "@/src/components/dashboard/admin-custom-request-assignment";
import { AdminReviewModeration } from "@/src/components/dashboard/admin-review-moderation";
import { GuideOnboardingForm } from "@/src/components/dashboard/guide-onboarding-form";
import { GuideCustomRequestCard } from "@/src/components/dashboard/guide-custom-request-card";
import { CustomerCustomRequestCard } from "@/src/components/booking/customer-custom-request-card";
import { LogoutForm } from "@/src/features/auth/components/auth-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Container } from "@/src/components/layout/container";
import { PageHeader } from "@/src/components/layout/page-header";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { getCurrentUser } from "@/src/lib/auth/session";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { getDashboardData } from "@/src/server/services/dashboard-service";
import {
  experienceVerificationStatusDescription,
  guideApplicationStatusDescription,
  guideApplicationStatusLabel,
} from "@/src/features/auth/guide-application-status";
import { requiresAuthenticatorApp } from "@/src/features/auth/lib/privileged-mfa";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="dashboard-metric">
      <CardContent className="relative p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-3 font-display text-3xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
        {hint ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function DashboardPanel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="dashboard-panel">
      <CardHeader className="pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

async function DashboardContent() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=%2Fdashboard");
  }
  if (requiresAuthenticatorApp(user.role) && !user.mfaVerified) {
    redirect("/account/security/two-factor");
  }

  const data = await getDashboardData(user);

  const firstName = user.name.split(" ")[0];
  if (data.role === "GUIDE" && data.onboardingOnly) {
    return (
      <Container className="dashboard-account py-12 sm:py-16">
        <PageHeader
          eyebrow="Guide onboarding"
          title={`Welcome, ${firstName}.`}
          description="Complete your profile, provide the required documents, and submit your proposed experience for manual review. No guide profile or experience becomes bookable through draft or submission."
          actions={<LogoutForm />}
        />
        <GuideOnboardingForm status={data.applicationStatus} />
      </Container>
    );
  }

  return (
      <Container className="dashboard-account py-12 sm:py-16">
        {data.role === "GUIDE" ? (
          <PageHeader
            eyebrow="Host operations"
            title={`Sawubona, ${firstName} — your season at a glance.`}
            description="Confirmed tours, guest payment states, and payouts across your South African experiences. Booking, payment, and refund states are shown separately, exactly as recorded."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button asChild className="min-h-11 rounded-full" variant="outline">
                  <Link href="/experiences">Public listings</Link>
                </Button>
                <Button asChild className="min-h-11 rounded-full" variant="outline">
                  <a download href="/api/dashboard/records?type=bookings">Download bookings</a>
                </Button>
                <Button asChild className="min-h-11 rounded-full" variant="outline">
                  <a download href="/api/dashboard/records?type=payouts">Download payouts</a>
                </Button>
                <LogoutForm />
              </div>
            }
          />
        ) : data.role === "ADMIN" || data.role === "SUPER_ADMIN" ? (
          <PageHeader
            eyebrow="Marketplace overview"
            title="Nomsa Tour Guides at a glance."
            description="Travellers, hosts, experiences, and payments across the marketplace."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button asChild className="min-h-11 rounded-full" variant="outline">
                  <a download href="/api/dashboard/records?type=bookings">Download bookings</a>
                </Button>
                <Button asChild className="min-h-11 rounded-full" variant="outline">
                  <a download href="/api/dashboard/records?type=payouts">Download payouts</a>
                </Button>
                <LogoutForm />
              </div>
            }
          />
        ) : (
          <PageHeader
            eyebrow="Your journeys"
            title={`Sawubona, ${firstName} — where to next?`}
            description="Your upcoming safaris, township walks, and coastal escapes in one calm place. Booking, payment, and refund states are shown separately."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button asChild className="min-h-11 rounded-full" variant="outline">
                  <Link href="/account/change-password">
                    Account security
                  </Link>
                </Button>
                <LogoutForm />
              </div>
            }
          />
        )}

        {data.role === "CUSTOMER" ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Metric label="Journeys ahead" value={data.upcomingBookings.length} hint="Confirmed and upcoming experiences." />
              <Metric label="Needs your eye" value={data.attentionBookings.length} hint="Pending, failed, cancelled, or refunding." />
              <Metric label="Stories collected" value={data.completedBookings.length} hint="Experiences you have completed." />
            </div>

            <section aria-label="Custom itinerary requests" className="mt-10" id="custom-itinerary-requests">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Request to book</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Custom itinerary requests</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    These requests are separate from instant bookings and are not confirmed until a booking and payment are recorded.
                  </p>
                </div>
                <Button asChild className="rounded-full" variant="outline">
                  <Link href="/custom-itinerary">Start a custom request</Link>
                </Button>
              </div>
              {data.customRequests.length ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {data.customRequests.map((request) => (
                    <CustomerCustomRequestCard key={request.id} request={request} />
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">You have not submitted a custom itinerary request.</p>
              )}
            </section>

            <section aria-label="Bookings needing attention" className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Needs your eye</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                    Payments, cancellations & refunds
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Anything awaiting payment, recently cancelled, or moving through a refund appears here
                    first — booking, payment, and refund states shown separately.
                  </p>
                </div>
                <Button asChild className="rounded-full" variant="outline">
                  <Link href="/experiences">
                    Keep exploring
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
              </div>
              {data.attentionBookings.length ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {data.attentionBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <Card className="dashboard-empty mt-5">
                  <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
                    <span className="grid size-12 place-items-center rounded-full bg-success/10 text-success">
                      <ShieldCheck aria-hidden="true" className="size-6" />
                    </span>
                    <p className="font-display text-lg font-semibold">All clear — nothing needs you right now.</p>
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                      No pending payments, cancellations, or refunds on your account. When something needs
                      attention, it will appear here with exactly what to do next.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

            <section aria-label="Upcoming journeys" className="mt-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Up next</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Your upcoming journeys
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Confirmed experiences, soonest first. Keep your booking reference handy on the day.
                </p>
              </div>
              {data.upcomingBookings.length ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {data.upcomingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <Card className="dashboard-empty mt-5">
                  <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
                    <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                      <Compass aria-hidden="true" className="size-6" />
                    </span>
                    <p className="font-display text-lg font-semibold">No journeys on the horizon yet.</p>
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                      From sunrise safaris to Bo-Kaap food walks, your next South African story starts
                      with a local host.
                    </p>
                    <Button asChild className="mt-1 rounded-full">
                      <Link href="/experiences">
                        Find your experience
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>

            <section aria-label="Past journeys and full history" className="mt-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Memory lane</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Past journeys & full history
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Completed travels alongside every cancelled or refunded booking — each with its
                  honest, current state.
                </p>
              </div>
              {data.historyBookings.length ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {data.historyBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <Card className="dashboard-empty mt-5">
                  <CardContent className="p-8 text-center sm:p-10">
                    <p className="font-display text-lg font-semibold">Your travel history will live here.</p>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                      Completed, cancelled, and refunded journeys will appear here with their booking,
                      payment, and refund states.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <Card className="dashboard-panel">
                <CardHeader className="pb-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    <Heart aria-hidden="true" className="size-3.5" />
                    Saved journeys
                  </p>
                  <CardTitle>Wishlist · {data.savedExperienceCount} saved</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.wishlist.length ? (
                    <ul className="grid gap-2.5">
                      {data.wishlist.map((experience) => (
                        <li key={experience.slug}>
                          <Link
                            className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/60"
                            href={`/experiences/${experience.slug}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">
                                {experience.title}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
                                {experience.destination.name}
                              </span>
                            </span>
                            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Experiences you save will appear here — start a collection of the places calling you.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="dashboard-panel">
                <CardHeader className="pb-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    <Bell aria-hidden="true" className="size-3.5" />
                    Updates from Nomsa Tour Guides
                  </p>
                  <CardTitle>Notifications{data.unreadNotifications > 0 ? ` · ${data.unreadNotifications} unread` : ""}</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.notifications.length ? (
                    <ul className="grid gap-3">
                      {data.notifications.map((notification) => (
                        <li
                          className="rounded-xl bg-secondary/40 px-3.5 py-3"
                          key={notification.id}
                        >
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                            {notification.title}
                            {notification.readAt ? null : (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                New
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{notification.body}</p>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">{formatDate(notification.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Quiet for now — booking updates and travel notes will land here.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="dashboard-panel">
                <CardHeader className="pb-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    <Sparkles aria-hidden="true" className="size-3.5" />
                    Stories you have told
                  </p>
                  <CardTitle>Reviews written</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.reviews.length ? (
                    <ul className="grid gap-3">
                      {data.reviews.map((review) => (
                        <li className="rounded-xl bg-secondary/40 px-3.5 py-3" key={review.id}>
                          <Link
                            className="text-sm font-semibold text-foreground hover:text-primary"
                            href={`/experiences/${review.experience.slug}`}
                          >
                            {review.experience.title}
                          </Link>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {review.rating}/5 · {review.reviewText}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      After a completed journey, your words here help local hosts welcome the next traveller.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="dashboard-panel">
                <CardHeader className="pb-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    <ShieldCheck aria-hidden="true" className="size-3.5" />
                    How payment works
                  </p>
                  <CardTitle>PayFast checkout</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Payments are handled securely by PayFast at checkout — this account never stores
                    card details. Each booking card above shows whether payment is pending, successful,
                    failed, or refunded.
                  </p>
                  <Button asChild className="mt-4 rounded-full" variant="outline">
                    <Link href="/experiences">
                      Browse experiences
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
            </>
        ) : data.role === "GUIDE" ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Tours ahead"
                value={data.upcomingBookingCount}
                hint="Confirmed and checked-in tours on your calendar."
              />
              <Metric
                label="Needs your eye"
                value={data.attentionBookings.length}
                hint="Payment pending, failed, or moving through a refund."
              />
              <Metric
                label="Open dates ahead"
                value={data.availabilityCount}
                hint="Future experience dates with places still available."
              />
              <Metric
                label="Payouts received"
                value={formatCurrency(data.paidPayouts)}
                hint="Recorded as paid out to you."
              />
            </div>

            <Card className="dashboard-panel mt-6">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Application status</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {guideApplicationStatusDescription(data.applicationStatus)}
                  </p>
                </div>
                <Badge variant={data.applicationStatus === "APPROVED" ? "success" : "warning"}>
                  {guideApplicationStatusLabel(data.applicationStatus)}
                </Badge>
              </CardContent>
            </Card>

            <div className="mt-8">
              <section aria-label="Assigned custom itinerary requests" className="mb-10">
                <h2 className="font-display text-xl font-semibold">Custom itinerary requests</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Review assigned requests, send a final offer from an approved listing, or decline. Travellers must accept the offer before payment can begin.
                </p>
                {data.customRequests.length ? (
                  <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                    {data.customRequests.map((request) => (
                      <GuideCustomRequestCard
                        experiences={data.offerableExperiences}
                        key={request.id}
                        request={request}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
                    No itinerary requests are currently assigned to you.
                  </p>
                )}
              </section>
              <section aria-label="Experience verification statuses">
              <h2 className="font-display text-xl font-semibold">Your experience listings</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Each experience requires separate approval. Only approved, published listings are visible to travellers.
              </p>
              {data.experienceReviews.length ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {data.experienceReviews.map((experience) => (
                    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4" key={experience.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{experience.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {experienceVerificationStatusDescription(experience.verificationStatus)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={experience.verificationStatus === "APPROVED" ? "success" : "warning"}>
                          {guideApplicationStatusLabel(experience.verificationStatus)}
                        </Badge>
                        {experience.verificationStatus === "APPROVED" && experience.status === "PUBLISHED" ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/experiences/${experience.slug}`}>View listing</Link>
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
                  No experience listings have been submitted yet.
                </p>
              )}
            </section>
            </div>

            <section aria-label="Tours ready to mark complete" className="mt-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Service completion</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Tours ready to close
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Only mark a tour completed after it has finished. Any pending payout uses the captured payment less recorded refunds and the owner-approved commission rate stored with that payout.
                </p>
              </div>
              {data.completionBookings.length ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {data.completionBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} tone="host" />
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No bookings are awaiting service completion.</p>
              )}
            </section>

            <section aria-label="Bookings needing attention" className="mt-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Needs your eye</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Payments &amp; refunds to watch
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Pending payments, failed collections, and refund movements appear here first — booking,
                  payment, and refund states shown separately. Until a tour reads both confirmed and paid,
                  it is worth holding off on preparations.
                </p>
              </div>
              {data.attentionBookings.length ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {data.attentionBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} tone="host" />
                  ))}
                </div>
              ) : (
                <Card className="dashboard-empty mt-5">
                  <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
                    <span className="grid size-12 place-items-center rounded-full bg-success/10 text-success">
                      <ShieldCheck aria-hidden="true" className="size-6" />
                    </span>
                    <p className="font-display text-lg font-semibold">All clear — nothing needs you right now.</p>
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                      No pending payments, failed collections, or refunds are recorded on the tours shown
                      here. Booking, payment, and refund states remain visible on each booking.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>
            <section aria-label="Upcoming tours" className="mt-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">On the horizon</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Confirmed tours ahead
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Soonest first — guests, destinations, and payment state at a glance as tour days approach.
                </p>
              </div>
              {data.upcomingBookings.length ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {data.upcomingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} tone="host" />
                  ))}
                </div>
              ) : (
                <Card className="dashboard-empty mt-5">
                  <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
                    <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                      <Compass aria-hidden="true" className="size-6" />
                    </span>
                    <p className="font-display text-lg font-semibold">No confirmed tours on the horizon yet.</p>
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                      Confirmed, paid bookings appear here as soon as guests reserve your experiences.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

            <section aria-label="Completed tours" className="mt-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Track record</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Completed tours
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Tours that have finished, with payment state exactly as recorded. Guest reviews appear
                  here once they are approved.
                </p>
              </div>
              {data.completedBookings.length ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {data.completedBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} tone="host" />
                  ))}
                </div>
              ) : (
                <Card className="dashboard-empty mt-5">
                  <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
                    <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                      <Sparkles aria-hidden="true" className="size-6" />
                    </span>
                    <p className="font-display text-lg font-semibold">No completed tours yet.</p>
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                      Finished tours move here once bookings close — ready for guest reviews.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>
            <section aria-label="Cancelled bookings" className="mt-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Archive</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Cancelled bookings
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Bookings that were cancelled, kept visible with their payment and refund states exactly
                  as recorded — a refund is never shown as complete unless the state says so.
                </p>
              </div>
              {data.cancelledBookings.length ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {data.cancelledBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} tone="host" />
                  ))}
                </div>
              ) : (
                <Card className="dashboard-empty mt-5">
                  <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
                    <span className="grid size-12 place-items-center rounded-full bg-success/10 text-success">
                      <ShieldCheck aria-hidden="true" className="size-6" />
                    </span>
                    <p className="font-display text-lg font-semibold">No cancelled bookings.</p>
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                      If a booking is ever cancelled, it stays visible here with its payment and refund state.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <DashboardPanel eyebrow="Earnings" title="Payout history">
                {data.payouts.length ? (
                  <ul className="grid gap-3">
                    {data.payouts.map((payout) => (
                      <li className="rounded-xl bg-secondary/40 px-3.5 py-3" key={payout.id}>
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(Number(payout.amount), payout.currency)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {payout.status.replaceAll("_", " ")} · {formatDate(payout.createdAt)}
                        </p>
                        {payout.grossAmount && payout.commissionAmount ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            After refunds {formatCurrency(Number(payout.grossAmount), payout.currency)} ·{" "}
                            {payout.commissionRate
                              ? `${new Intl.NumberFormat("en-ZA", { style: "percent", maximumFractionDigits: 2 }).format(Number(payout.commissionRate))} commission`
                              : "Commission rate unavailable"}{" "}
                            {formatCurrency(Number(payout.commissionAmount), payout.currency)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Commission breakdown is unavailable for this older payout.
                          </p>
                        )}
                        {payout.status !== "PAID" ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Not recorded as paid. Eligible {payout.eligibleAt ? formatDate(payout.eligibleAt) : "date unavailable"}.
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Payouts appear here once recorded against completed tours.
                  </p>
                )}
              </DashboardPanel>
              <DashboardPanel eyebrow="Kind words" title="Recent reviews">
                {data.reviews.length ? (
                  <ul className="grid gap-3">
                    {data.reviews.map((review) => (
                      <li className="rounded-xl bg-secondary/40 px-3.5 py-3" key={review.id}>
                        <p className="text-sm font-semibold text-foreground">{review.experience.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {review.rating}/5 · {review.reviewText}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Approved guest reviews appear here once moderation passes.
                  </p>
                )}
              </DashboardPanel>
            </div>
          </>
        ) : (
          <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Users" value={data.users} />
            <Metric label="Guides" value={data.guides} />
            <Metric label="Destinations" value={data.destinations} />
            <Metric label="Experiences" value={data.experiences} />
            <Metric label="Bookings" value={data.bookings} />
            <Metric label="Successful payment volume" value={formatCurrency(data.revenue)} />
            <Metric label="Pending payments" value={data.pendingPayments} />
            <Metric label="Payouts awaiting approval" value={data.pendingPayouts} />
            <Metric label="Reviews awaiting moderation" value={data.moderationQueue} />
          </div>
          <AdminFinancialTools
            payouts={data.pendingPayoutRecords}
            paymentCases={data.recentPaymentCases}
            serviceBookings={data.pendingServiceCompletions}
          />
          <AdminGuideReview />
          <AdminReviewModeration />
          <section aria-label="Custom itinerary request queue" className="mt-8 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold">Custom itinerary request queue</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Request-to-book submissions awaiting review. A request or quote is not a confirmed booking or payment.
            </p>
            {data.customRequests.length ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.customRequests.map((request) => (
                  <li className="rounded-xl border border-border/60 p-4" key={request.id}>
                    <p className="font-semibold">{request.destinationText} · {request.status.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.customer.name} · {request.customer.email} · {request.travellerCount} travellers
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.flexibleDates
                        ? "Flexible dates"
                        : `${request.travelStartDate ? formatDate(request.travelStartDate) : "Date unavailable"} – ${request.travelEndDate ? formatDate(request.travelEndDate) : "Date unavailable"}`}
                      {request.budget
                        ? ` · Budget ${formatCurrency(Number(request.budget), request.budgetCurrency || "ZAR")}`
                        : ""}
                    </p>
                    {request.interests.length ? (
                      <p className="mt-2 text-xs text-muted-foreground">Interests: {request.interests.join(", ")}</p>
                    ) : null}
                    {request.notes ? <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{request.notes}</p> : null}
                    {request.quotedAmount ? (
                      <p className="mt-2 text-sm font-semibold">
                        Quote recorded: {formatCurrency(Number(request.quotedAmount), request.quotedCurrency || "ZAR")}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {request.assignedGuide
                        ? `Assigned to ${request.assignedGuide.user.name}`
                        : "Not assigned to a guide"}
                    </p>
                    <AdminCustomRequestAssignment
                      assignedGuideId={request.assignedGuideId}
                      canAssign={request.status === "SUBMITTED" || request.status === "ASSIGNED"}
                      requestId={request.id}
                    />
                    <p className="mt-2 break-all text-[10px] text-muted-foreground">Reference: {request.id}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No custom itinerary requests need review.</p>
            )}
          </section>
          </>
        )}
      </Container>
  );
}

export default function DashboardPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<Container className="py-12"><p className="text-sm text-muted-foreground">Loading your dashboard…</p></Container>}>
        <DashboardContent />
      </Suspense>
    </PublicLayout>
  );
}
