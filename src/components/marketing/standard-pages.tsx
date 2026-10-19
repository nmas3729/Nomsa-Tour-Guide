import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock3,
  Compass,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { ExperienceCard } from "@/src/components/cards/experience-card";
import { GuideCard } from "@/src/components/cards/guide-card";
import { DestinationCard } from "@/src/components/cards/destination-card";
import { Container } from "@/src/components/layout/container";
import { Section } from "@/src/components/layout/section";
import { PublicPageIntro } from "./public-layout";
import { ContactForm } from "./marketing-forms";
import { ContactEmailLink } from "./contact-email-link";
import { categories, destinations, provinces } from "@/src/data/public-site";
import { getApprovedExperiences } from "@/src/server/services/public-verification-service";
import { getApprovedGuideProfiles } from "@/src/server/services/public-verification-service";

const values = [
  {
    icon: HeartHandshake,
    title: "People before itineraries",
    text: "The most meaningful journeys begin with listening, sharing and seeing a place through someone else's eyes.",
  },
  {
    icon: ShieldCheck,
    title: "Trust is part of the journey",
    text: "We want every traveller and guide to feel respected, informed and welcome from the first hello.",
  },
  {
    icon: Sparkles,
    title: "Curiosity with care",
    text: "We believe travel can be joyful and thoughtful: a way to learn, connect and leave a positive footprint.",
  },
];

export function AboutPage() {
  return (
    <>
      <Section className="pb-8 sm:pb-12">
        <Container>
          <PublicPageIntro
            className="max-w-5xl"
            eyebrow="Our story"
            title="A place is more than a pin on a map."
            titleClassName="text-balance lg:whitespace-nowrap"
          />
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="relative isolate min-h-[360px] overflow-hidden rounded-[2rem] bg-muted sm:min-h-[480px]">
              <Image
                alt="The Three Rondavels rising above the Blyde River Canyon in Mpumalanga"
                className="object-cover"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                src="/images/south-africa/blyde-three-rondavels.jpg"
              />
            </div>
            <div className="max-w-xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">Company Story</p>
              <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">
                Travel can open a door between people.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground">
                The moments that stay with us are often shared with someone who knows a place well: a hidden coastal view,
                a story behind a mural, or a lookout beyond the usual route. Nomsa Tour Guides connects travellers with
                independent guides who share that local knowledge.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <Card className="overflow-hidden border-border/70 shadow-none">
            <CardContent className="grid p-0 md:grid-cols-[0.8fr_1.2fr]">
              <div className="relative aspect-[4/5] min-h-[320px] overflow-hidden bg-secondary sm:min-h-[420px]">
                <Image
                  alt="Nomsa Bambisa, Head of Nomsa Tour Guides"
                  className="object-cover object-top"
                  fill
                  sizes="(max-width: 768px) calc(100vw - 2rem), 40vw"
                  src="/images/nomsa.png"
                />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  The person behind the journey
                </p>
                <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">
                  Nomsa Bambisa
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-muted-foreground sm:text-base">
                  Head of Nomsa Tour Guides
                  <span aria-hidden="true"> | </span>
                  <span className="block sm:inline">Shareholder, NMAS INNOVATIONS (Pty) Ltd</span>
                </p>
                <p className="mt-6 text-sm leading-7 text-muted-foreground sm:text-base">
                  Nomsa Bambisa leads Nomsa Tour Guides, the tourism division of NMAS INNOVATIONS (Pty) Ltd. She studied
                  Travel and Tourism at Boston College and is passionate about the country&apos;s people, culture, and heritage.
                </p>
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>

      <Section className="pb-10 pt-0">
        <Container>
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="bg-primary text-primary-foreground shadow-none">
              <CardContent className="p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/70">Our Mission</p>
                <h2 className="mt-3 font-display text-2xl font-medium">Make local connection part of every journey.</h2>
                <p className="mt-3 text-sm leading-6 text-primary-foreground/80">
                  Support independent guides and connect travellers with local experiences.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Our Vision</p>
                <h2 className="mt-3 font-display text-2xl font-medium">A world that travels closer to home.</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  A tourism economy led by local voices, with benefits returning to their communities.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      <Section className="bg-secondary/45">
        <Container>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Values</p>
            <h2 className="font-display text-3xl font-medium sm:text-4xl">What guides everything we do</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              A good marketplace should make room for trust, dignity, safety, and genuine local voices.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {values.map(({ icon: Icon, title, text }) => (
              <Card className="border-border/70 shadow-none" key={title}>
                <CardContent className="p-6">
                  <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon aria-hidden="true" size={21} />
                  </span>
                  <h3 className="font-display text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground sm:px-10 sm:py-14">
            <h2 className="font-display text-3xl font-medium sm:text-4xl">Explore or host an experience.</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild className="bg-white text-primary hover:bg-white/90">
                <Link href="/experiences">
                  Explore experiences
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              </Button>
              <Button asChild className="border-white/40 text-white hover:bg-white/10" variant="outline">
                <Link href="/become-a-guide">Become a guide</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

export function ContactPage() {
  return (
    <>
      <Section className="pb-8 sm:pb-12">
        <Container>
          <PublicPageIntro
            description="Have questions about experiences, regional planning, or becoming a local guide? Our team is based in South Africa and ready to help."
            eyebrow="Say hello"
            title="Let's start a conversation."
          />
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="shadow-none">
              <CardContent className="p-6 sm:p-8">
                <h2 className="mb-6 font-display text-2xl font-semibold">Send us a note</h2>
                <ContactForm />
              </CardContent>
            </Card>

            <div className="grid gap-5">
              <Card className="shadow-none">
                <CardContent className="grid gap-5 p-6 sm:p-8">
                  <h2 className="font-display text-2xl font-semibold">Contact Information</h2>
                  <ContactEmailLink />
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Clock3 aria-hidden="true" size={19} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Business Hours</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Monday – Friday: 08:30 – 17:00 SAST
                        <br />
                        Saturday: 09:00 – 13:00 SAST
                        <br />
                        Sunday & Public Holidays: Closed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <MapPin aria-hidden="true" size={19} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Location</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Headquartered in Cape Town & Johannesburg, serving travellers and guides nationwide.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <iframe
                  allowFullScreen
                  className="block min-h-64 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://maps.google.com/maps?output=embed&saddr=-33.9249%2C18.4241&daddr=-26.2041%2C28.0473"
                  title="Approximate city-centre route between Cape Town and Johannesburg, South Africa"
                />
                <p className="px-4 py-3 text-xs text-muted-foreground">
                  Approximate city-centre locations for our Cape Town and Johannesburg headquarters; these are not street addresses.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

export function DestinationsPage() {
  return (
    <>
      <Section className="pb-8 sm:pb-12">
        <Container>
          <PublicPageIntro
            description="Coast, mountains, wildlife, and heritage across nine provinces."
            eyebrow="Destinations"
            title="Many places. A thousand ways to feel at home."
          />
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              {destinations.length} destination regions
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {destinations.map((destination) => (
              <DestinationCard
                key={destination.slug}
                {...destination}
                href={provinces.some((province) => province === destination.province)
                  ? `/experiences?province=${encodeURIComponent(destination.province)}`
                  : "/experiences"}
              />
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

export async function GuidesPage() {
  await connection();
  const guides = await getApprovedGuideProfiles();
  return (
    <>
      <Section className="pb-8 sm:pb-12">
        <Container>
          <PublicPageIntro
            eyebrow="Local Guides"
            title="Meet the people who know the place."
          />
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          {guides.length > 0 ? (
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {guides.length} approved guide profiles
              </p>
            </div>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guides.length ? guides.map((guide) => <GuideCard key={guide.name} {...guide} />) : (
              <p className="col-span-full rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
                We&apos;re welcoming local guides now. Meet our first approved guides here soon.
              </p>
            )}
          </div>

          <div className="mt-12 rounded-3xl bg-secondary/60 px-6 py-10 text-center sm:px-10">
            <UsersRound aria-hidden="true" className="mx-auto text-primary" size={28} />
            <h2 className="mt-3 font-display text-2xl font-semibold">Interested in becoming a guide?</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Share your local knowledge with travellers.
            </p>
            <Button asChild className="mt-6">
              <Link href="/become-a-guide">
                Become a guide
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}

export async function ExperiencesPage() {
  await connection();
  const experiences = await getApprovedExperiences();
  return (
    <>
      <Section className="pb-8 sm:pb-12">
        <Container>
          <PublicPageIntro
            description="Browse current listings and review the guide and experience details before booking."
            eyebrow="Experiences"
            title="Experiences made personal."
          />
        </Container>
      </Section>

      <Section className="pt-4">
        <Container>
          {/* Category Filter Pills (Visual Only) */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm">
              All
            </span>
            {categories.map((cat) => (
              <span
                className="cursor-pointer rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                key={cat.name}
              >
                {cat.name}
              </span>
            ))}
          </div>

          {/* Visual Filter Bar */}
          <div className="mb-8 grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end">
            <label className="grid gap-1.5 text-xs font-semibold" htmlFor="experience-destination">
              Destination
              <select className="ui-select font-normal text-xs" defaultValue="" id="experience-destination">
                <option value="">All Destinations</option>
                {destinations.map((destination) => (
                  <option key={destination.slug}>{destination.name}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-semibold" htmlFor="experience-category">
              Category
              <select className="ui-select font-normal text-xs" defaultValue="" id="experience-category">
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.name}>{cat.name}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-semibold" htmlFor="experience-duration">
              Duration
              <select className="ui-select font-normal text-xs" defaultValue="" id="experience-duration">
                <option value="">Any Duration</option>
                <option>Under 3 hours</option>
                <option>Half day (3–5 hrs)</option>
                <option>Full day (6+ hrs)</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-semibold" htmlFor="experience-sort">
              Sort by
              <select className="ui-select font-normal text-xs" defaultValue="featured" id="experience-sort">
                <option value="featured">Featured</option>
                <option>Top Rated</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </label>

            <Button aria-label="Filter experiences (visual only)" className="w-full sm:col-span-2 lg:col-span-1">
              Apply Filters
            </Button>
          </div>

          <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
            <p>{experiences.length} experiences</p>
            <p>Filters are visual previews</p>
          </div>

          {/* Responsive Experience Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {experiences.map((experience) => (
              <ExperienceCard
                href={`/experiences/${experience.slug}`}
                key={experience.slug}
                {...experience}
              />
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

export function BecomeGuidePage() {
  return (
    <>
      <Section className="pb-8 sm:pb-12">
        <Container>
          <PublicPageIntro
            description="Share the places and stories you know with travellers."
            eyebrow="Become a Guide"
            title="Your home has a story. You can tell it."
          />
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="relative isolate min-h-[350px] overflow-hidden rounded-[2rem] bg-muted sm:min-h-[460px]">
              <Image
                alt="Guests viewing wildlife from a safari vehicle at Kapama Game Reserve"
                className="object-cover"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                src="/images/south-africa/kapama-game-drive.jpg"
              />
            </div>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Make Room for Meaningful Travel
              </p>
              <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">
                Turn what you know into someone’s favourite day.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground">
                Nomsa Tour Guides connects independent guides with travellers through experiences rooted in local knowledge,
                from wildlife walks to Soweto tours and Winelands tastings.
              </p>
              <ul className="mt-6 grid gap-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-3">
                  <BadgeCheck aria-hidden="true" className="shrink-0 text-primary" size={18} />
                  <span>Set your schedule, pricing, and group size</span>
                </li>
                <li className="flex items-center gap-3">
                  <HeartHandshake aria-hidden="true" className="shrink-0 text-primary" size={18} />
                  <span>Meet travellers interested in local perspectives</span>
                </li>
                <li className="flex items-center gap-3">
                  <Star aria-hidden="true" className="shrink-0 text-primary" size={18} />
                  <span>Build your profile through guest feedback</span>
                </li>
              </ul>
              <Button asChild className="mt-7" size="lg">
                <Link href="/register?role=GUIDE">
                  Start your guide application
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </Button>
              <p className="mt-3 max-w-lg text-xs leading-5 text-muted-foreground">
                Applications go to a dedicated review inbox, separate from general enquiries. The Nomsa Tour Guides team reviews
                each one manually: pending, under review, then approved or rejected. Approved profiles require a
                separate publication step; not every application is published.
              </p>
            </div>
          </div>
        </Container>
      </Section>

    </>
  );
}

export function NotFoundPage() {
  return (
    <Section className="flex min-h-[65vh] items-center">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Compass aria-hidden="true" size={30} />
          </span>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-primary">404 · A little off the map</p>
          <h1 className="mt-3 font-display text-5xl font-medium tracking-tight sm:text-7xl">This page wandered off.</h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            We couldn&apos;t find the page you&apos;re looking for. It may have moved, or the link may be outdated. Let&apos;s get you back to familiar trails.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="icon">
              <Link aria-label="Back to home" href="/">
                <ArrowLeft aria-hidden="true" size={18} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/destinations">Explore destinations</Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function LegalPage({
  title,
  eyebrow,
  introduction,
  sections,
  lastUpdated,
}: {
  title: string;
  eyebrow: string;
  introduction: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  lastUpdated: string;
}) {
  return (
    <Section>
      <Container>
        <header className="mx-auto mb-12 max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">{introduction}</p>
          <p className="mt-4 text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
        </header>
        <article className="mx-auto max-w-3xl">
          <div className="grid gap-9">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-2xl font-semibold">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p className="mt-3 text-sm leading-7 text-muted-foreground" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
          <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
            Questions about this page?{" "}
            <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/contact">
              Contact our team
            </Link>
            .
          </p>
        </article>
      </Container>
    </Section>
  );
}
