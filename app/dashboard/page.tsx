import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, Compass, Heart, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { BookingCard } from "@/src/components/cards/booking-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Container } from "@/src/components/layout/container";
import { PageHeader } from "@/src/components/layout/page-header";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { getCurrentUser } from "@/src/lib/auth/session";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { getDashboardData } from "@/src/server/services/dashboard-service";

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

  const data = await getDashboardData(user);

  const firstName = user.name.split(" ")[0];

  return (
      <Container className="dashboard-account py-12 sm:py-16">
        {data.role === "GUIDE" ? (
          <PageHeader
            eyebrow="Host operations"
            title={`Sawubona, ${firstName} — your season at a glance.`}
            description="Confirmed tours, guest payment states, and payouts across your South African experiences. Booking, payment, and refund states are shown separately, exactly as recorded."
            actions={
              <Button asChild className="min-h-11 rounded-full" variant="outline">
                <Link href="/experiences">Public listings</Link>
              </Button>
            }
          />
        ) : data.role === "ADMIN" || data.role === "SUPER_ADMIN" ? (
          <PageHeader
            eyebrow="Marketplace overview"
            title="Nomsa at a glance."
            description="Travellers, hosts, experiences, and payments across the marketplace."
          />
        ) : (
          <PageHeader
            eyebrow="Your journeys"
            title={`Sawubona, ${firstName} — where to next?`}
            description="Your upcoming safaris, township walks, and coastal escapes in one calm place. Booking, payment, and refund states are shown separately."
            actions={
              <Button asChild className="min-h-11 rounded-full" variant="outline">
                <Link href="/account/change-password">
                  Account security
                </Link>
              </Button>
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
                    Word from Nomsa
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
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Host verification</p>
                  <p className="mt-1 text-sm text-muted-foreground">Your standing with Nomsa Tour Guides.</p>
                </div>
                <Badge variant={data.verificationStatus === "APPROVED" ? "success" : "warning"}>
                  {data.verificationStatus.replaceAll("_", " ")}
                </Badge>
              </CardContent>
            </Card>

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
