import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock3,
  Compass,
  HeartHandshake,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { ExperienceCard } from "@/src/components/cards/experience-card";
import { GuideCard } from "@/src/components/cards/guide-card";
import { DestinationCard } from "@/src/components/cards/destination-card";
import { Container } from "@/src/components/layout/container";
import { Section } from "@/src/components/layout/section";
import { PublicPageIntro } from "./public-layout";
import { ContactForm } from "./marketing-forms";
import { categories, destinations, experiences, guides, provinces } from "@/src/data/public-site";

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
            description="We believe the heart of South Africa is found in the people who share it. Nomsa brings travellers and local guides together for journeys with more meaning."
            eyebrow="Our story"
            title="A place is more than a pin on a map."
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
                unoptimized
              />
            </div>
            <div className="max-w-xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">Company Story</p>
              <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">
                Travel can open a door between people.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground">
                South Africa is full of extraordinary places, but the moments that stay with us are often the ones shared
                with someone who knows them intimately. A hidden coastal view. A story behind a street mural. The quiet lookout
                just beyond the typical tourist route.
              </p>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Nomsa Tour Guides was founded to celebrate authentic local perspectives: empowering independent South African
                guides to build sustainable tourism livelihoods, and giving travellers memorable, respectful encounters across
                our nation.
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
                <Avatar className="size-full rounded-none bg-secondary">
                  <AvatarImage
                    alt="Nomsa Bambisa, Head of Nomsa Tour Guides"
                    className="object-cover object-top"
                    src="/images/nomsa.png"
                  />
                  <AvatarFallback className="rounded-none text-5xl font-semibold text-primary">
                    NB
                  </AvatarFallback>
                </Avatar>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
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
                  Nomsa Bambisa leads Nomsa Tour Guides, the tourism division of NMAS INNOVATIONS (Pty) Ltd. With a
                  background in Travel and Tourism from Boston College, she is passionate about showcasing the beauty,
                  culture, heritage, and diversity of South Africa.
                </p>
                <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                  Through her leadership, Nomsa is committed to creating authentic, meaningful, and memorable travel
                  experiences that connect visitors with the people, places, and stories that make South Africa unique.
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
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Our Mission</p>
                <h2 className="mt-3 font-display text-2xl font-medium">Make local connection part of every journey.</h2>
                <p className="mt-3 text-sm leading-6 text-white/80">
                  We support independent local guides and help travellers discover immersive experiences that
                  celebrate South Africa&apos;s diverse cultures, landscapes, and wildlife.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Our Vision</p>
                <h2 className="mt-3 font-display text-2xl font-medium">A world that travels closer to home.</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  We envision a thriving tourism ecosystem where local voices lead, travellers arrive with curiosity and
                  humility, and economic benefits flow directly back into regional communities.
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
            <h2 className="font-display text-3xl font-medium sm:text-4xl">Come see South Africa with us.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/80">
              Whether you are planning an unforgettable visit or hoping to share your regional expertise, there is a place
              for you at Nomsa.
            </p>
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
                  <a className="flex items-start gap-4 text-foreground no-underline" href="mailto:hello@nomsatourguides.co.za">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Mail aria-hidden="true" size={19} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">Email our team</span>
                      <span className="mt-1 block text-sm text-muted-foreground">hello@nomsatourguides.co.za</span>
                    </span>
                  </a>
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

              {/* Google Map Placeholder */}
              <div
                aria-label="Google Map placeholder showing South Africa"
                className="relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-[#e9eee7] p-6 text-center dark:bg-[#29382e]"
                role="img"
              >
                <div
                  aria-hidden="true"
                  className="contact-map-grid absolute inset-0 opacity-50"
                />
                <span className="relative grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <MapPin aria-hidden="true" size={22} />
                </span>
                <p className="relative mt-4 font-display text-xl font-semibold">South Africa, our home</p>
                <p className="relative mt-1 text-sm text-muted-foreground">
                  Google Map Placeholder · 30.5595° S, 22.9375° E
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
            description="Explore South Africa by province, from savanna and mountain landscapes to coastal towns, living heritage, vineyard valleys, and local food."
            eyebrow="Destinations"
            title="Many places. A thousand ways to feel at home."
          />
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              Explore {destinations.length} destination regions across South Africa
            </p>
            <p className="text-xs text-muted-foreground">Discover landscapes and local heritage across all nine provinces</p>
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

export function GuidesPage() {
  return (
    <>
      <Section className="pb-8 sm:pb-12">
        <Container>
          <PublicPageIntro
            description="Meet the people who know these places best. Explore guide profiles by home region, languages, interests, and the experiences they currently lead."
            eyebrow="Local Guides"
            title="Meet the people who know the place."
          />
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              Showing {guides.length} local guide profiles
            </p>
            <span className="inline-flex items-center gap-2 text-xs leading-relaxed text-muted-foreground">
              <MapPin aria-hidden="true" className="shrink-0 text-primary" size={16} /> Browse each guide&apos;s listed home region and experience themes
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <GuideCard
                key={guide.slug}
                {...guide}
                experiences={experiences
                  .filter((experience) => experience.guide.name === guide.name)
                  .map((experience) => ({
                    title: experience.title,
                    href: `/experiences/${experience.slug}`,
                    destination: [experience.destination, ...experience.provinces].filter(Boolean).join(" · "),
                  }))}
              />
            ))}
          </div>

          <div className="mt-12 rounded-3xl bg-secondary/60 px-6 py-10 text-center sm:px-10">
            <UsersRound aria-hidden="true" className="mx-auto text-primary" size={28} />
            <h2 className="mt-3 font-display text-2xl font-semibold">Have a region or story you love to share?</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              We welcome guides, cultural storytellers, and wilderness enthusiasts who would like to share their perspective.
            </p>
            <Button asChild className="mt-6">
              <Link href="/become-a-guide">
                Meet Nomsa as a guide
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}

export function ExperiencesPage() {
  return (
    <>
      <Section className="pb-8 sm:pb-12">
        <Container>
          <PublicPageIntro
            description="Slow down, look closer, and connect with the people who know South Africa intimately. Browse current listings and review each guide and experience before booking."
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
            <p>Showing {experiences.length} curated South African experiences</p>
            <p>Filters are visual previews</p>
          </div>

          {/* Responsive Experience Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {experiences.map((experience) => (
              <ExperienceCard key={experience.slug} {...experience} />
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
            description="Share the landscapes, food, wildlife, heritage, and neighbourhood stories you know. Help travellers experience South Africa through the place you call home."
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
                unoptimized
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
                Nomsa is created for independent South African guides who want to share more than a standard itinerary.
                Whether you lead wildlife tracking in Mpumalanga, walking tours through Soweto, or boutique wine pairings in Franschhoek,
                we provide the platform to connect with travellers who value genuine regional connection.
              </p>
              <ul className="mt-6 grid gap-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-3">
                  <BadgeCheck aria-hidden="true" className="shrink-0 text-primary" size={18} />
                  <span>Set your own schedules, pricing, and small-group group sizes</span>
                </li>
                <li className="flex items-center gap-3">
                  <HeartHandshake aria-hidden="true" className="shrink-0 text-primary" size={18} />
                  <span>Connect with respectful global travellers seeking authentic local perspective</span>
                </li>
                <li className="flex items-center gap-3">
                  <Star aria-hidden="true" className="shrink-0 text-primary" size={18} />
                  <span>Build your profile and reputation through traveller feedback</span>
                </li>
              </ul>
              <Button asChild className="mt-7" size="lg">
                <Link href="/register?role=GUIDE">
                  Start your guide application
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Our team will review your application and share the next steps.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="bg-secondary/45">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">Rooted here. Ready to welcome.</p>
            <h2 className="font-display text-3xl font-medium sm:text-4xl">
              Local knowledge transforms the way someone sees South Africa.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              From first-time international visitors to domestic explorers, your unique perspective is what gives a journey its lasting meaning.
              Join local hosts sharing their South African knowledge and stories.
            </p>
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
