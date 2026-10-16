import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Container } from "@/src/components/layout/container";
import { PageHeader } from "@/src/components/layout/page-header";
import { PublicLayout } from "@/src/components/marketing/public-layout";
import { getCurrentUser } from "@/src/lib/auth/session";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { getDashboardData } from "@/src/server/services/dashboard-service";

type ListItem = { title: string; detail: string; href?: string };

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="relative p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-3 font-display text-3xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function RecordList({ title, items, empty }: { title: string; items: ListItem[]; empty: string }) {
  return (
    <Card>
      <CardHeader className="pb-4"><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {items.length ? (
          <ul className="divide-y divide-border">
            {items.map((item, index) => (
              <li className="py-4 first:pt-0 last:pb-0" key={`${item.title}-${index}`}>
                {item.href ? (
                  <Link className="font-medium text-primary underline-offset-4 hover:underline" href={item.href}>
                    {item.title}
                  </Link>
                ) : (
                  <p className="font-medium">{item.title}</p>
                )}
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}

async function DashboardContent() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=%2Fdashboard");
  }

  const data = await getDashboardData(user);
  const heading =
    data.role === "CUSTOMER" ? "Your travel dashboard" :
    data.role === "GUIDE" ? "Guide dashboard" : "Marketplace administration";

  return (
      <Container className="py-12 sm:py-16">
        <PageHeader
          eyebrow={data.role}
          title={`${heading}, ${user.name.split(" ")[0]}.`}
          description="A clear view of your Nomsa Tour Guides activity."
          actions={
            <Link className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted" href="/account/change-password">
              Account security
            </Link>
          }
        />

        {data.role === "CUSTOMER" ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Metric label="Unread notifications" value={data.unreadNotifications} />
            <Metric label="Saved experiences" value={data.savedExperienceCount} />
            <RecordList
              title="Upcoming experiences"
              empty="Confirmed upcoming bookings will appear here."
              items={data.upcomingBookings.map((booking) => ({
                title: booking.experience.title,
                detail: `${formatDate(booking.experienceDate)} · ${booking.status.replaceAll("_", " ")} · ${formatCurrency(Number(booking.totalPrice), booking.currency)}`,
                href: `/experiences/${booking.experience.slug}`,
              }))}
            />
            <RecordList
              title="Completed experiences"
              empty="Completed bookings will appear here."
              items={data.completedBookings.map((booking) => ({
                title: booking.experience.title,
                detail: `${formatDate(booking.experienceDate)} · ${formatCurrency(Number(booking.totalPrice), booking.currency)}`,
                href: `/experiences/${booking.experience.slug}`,
              }))}
            />
            <RecordList
              title="Wishlist"
              empty="Experiences you save will appear here."
              items={data.wishlist.map((experience) => ({
                title: experience.title,
                detail: experience.destination.name,
                href: `/experiences/${experience.slug}`,
              }))}
            />
            <RecordList
              title="Notifications"
              empty="You don't have notifications yet."
              items={data.notifications.map((notification) => ({
                title: notification.title,
                detail: `${notification.body} · ${formatDate(notification.createdAt)}${notification.readAt ? "" : " · Unread"}`,
              }))}
            />
            <RecordList
              title="Reviews written"
              empty="Reviews you write after a completed experience will appear here."
              items={data.reviews.map((review) => ({
                title: review.experience.title,
                detail: `${review.rating}/5 · ${review.reviewText}`,
                href: `/experiences/${review.experience.slug}`,
              }))}
            />
            <RecordList
              title="Saved payment methods"
              empty="Payment details are handled securely by PayFast at checkout; this marketplace does not store card details."
              items={[]}
            />
          </div>
        ) : data.role === "GUIDE" ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <Metric label="Confirmed upcoming tours" value={data.upcomingBookingCount} />
            <Metric label="Available future time slots" value={data.availabilityCount} />
            <Metric label="Payouts received" value={formatCurrency(data.paidPayouts)} />
            <Card className="lg:col-span-3">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
                <p className="text-sm text-muted-foreground">Guide verification</p>
                <Badge variant={data.verificationStatus === "APPROVED" ? "success" : "warning"}>
                  {data.verificationStatus.replaceAll("_", " ")}
                </Badge>
              </CardContent>
            </Card>
            <RecordList
              title="Upcoming tours"
              empty="Confirmed tour bookings will appear here."
              items={data.upcomingBookings.map((booking) => ({
                title: booking.experience.title,
                detail: `${formatDate(booking.experienceDate)} · ${booking.status.replaceAll("_", " ")}`,
                href: `/experiences/${booking.experience.slug}`,
              }))}
            />
            <RecordList
              title="Payout history"
              empty="Payouts will appear here when created."
              items={data.payouts.map((payout) => ({
                title: formatCurrency(Number(payout.amount), payout.currency),
                detail: `${payout.status.replaceAll("_", " ")} · ${formatDate(payout.createdAt)}`,
              }))}
            />
            <RecordList
              title="Recent reviews"
              empty="Approved reviews will appear here."
              items={data.reviews.map((review) => ({
                title: review.experience.title,
                detail: `${review.rating}/5 · ${review.reviewText}`,
              }))}
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
