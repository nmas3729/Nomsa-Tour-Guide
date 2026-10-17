"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  CookingPot,
  CreditCard,
  Headphones,
  HeartHandshake,
  Home,
  Landmark,
  Leaf,
  MapPin,
  Mountain,
  Palette,
  Search,
  Sparkles,
  Star,
  Sun,
  UsersRound,
  Waves,
  Wine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ExperienceCard } from "@/src/components/cards/experience-card";
import { GuideCard } from "@/src/components/cards/guide-card";
import { DestinationCard } from "@/src/components/cards/destination-card";
import { Container } from "@/src/components/layout/container";
import { Section } from "@/src/components/layout/section";
import { imageAlt } from "@/src/lib/image";
import { FadeIn, FadeInScale, SlideIn } from "@/src/components/ui/motion";
import { NewsletterForm } from "./marketing-forms";
import { categories, destinations, experiences, guides, provinces, testimonials } from "@/src/data/public-site";

const categoryIcons: Record<string, LucideIcon> = {
  leaf: Leaf,
  mountain: Mountain,
  palette: Palette,
  wine: Wine,
  home: Home,
  food: CookingPot,
  waves: Waves,
  landmark: Landmark,
  sun: Sun,
  sparkles: Sparkles,
};

const trustPillars = [
  {
    icon: Compass,
    title: "Know Your Guide",
    description: "Explore each guide profile's background, experience, languages, and stated specialties before choosing.",
  },
  {
    icon: CreditCard,
    title: "PayFast Checkout",
    description: "Continue to PayFast's hosted checkout. Booking status updates after payment verification.",
  },
  {
    icon: Compass,
    title: "Local Perspectives",
    description: "Find experiences shaped by guides' own interests, regional knowledge, and personal stories.",
  },
  {
    icon: CheckCircle2,
    title: "Clear Booking Terms",
    description: "Review the date, group details, price, and cancellation terms shown for each experience before booking.",
  },
  {
    icon: HeartHandshake,
    title: "Guest Reviews",
    description: "Ratings and comments are shown on experience listings where reviews are available.",
  },
  {
    icon: Headphones,
    title: "A Team You Can Contact",
    description: "Email our team with questions about experiences, listings, or your booking.",
  },
];

const howItWorksSteps = [
  {
    step: "01",
    title: "Dream & Discover",
    text: "Explore handcrafted journeys and private tastings led by independent South African hosts.",
  },
  {
    step: "02",
    title: "Reserve Seamlessly",
    text: "Choose your preferred date, review the reservation, and continue to PayFast's hosted checkout.",
  },
  {
    step: "03",
    title: "Immerse & Connect",
    text: "Experience the bushveld, coastlines, and historic townships with a guide who calls it home.",
  },
  {
    step: "04",
    title: "Share the Story",
    text: "Leave heartfelt feedback to empower independent local guides and inspire fellow travellers.",
  },
];

function HomeHero() {
  return (
    <section className="home-hero relative isolate -mt-20 flex min-h-[100svh] flex-col justify-between overflow-hidden bg-[#040706] text-white">
      <Image
        alt="Cape Town's coastline and city beneath the distinctive Table Mountain plateau"
        className="home-hero-image absolute inset-0 -z-30 object-cover object-center"
        fill
        priority
        sizes="100vw"
        src="https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=2600&q=90"
        unoptimized
      />

      <div aria-hidden="true" className="home-hero-aurora absolute inset-0 -z-20" />
      <div aria-hidden="true" className="home-hero-vignette absolute inset-0 -z-10" />

      {/* Hero Content */}
      <Container className="flex flex-1 flex-col justify-center pb-20 pt-36 sm:pt-44 lg:pt-48">
        <FadeIn className="w-full max-w-none">
          {/* Eyebrow & local discovery cue */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="home-hero-kicker inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-md">
              <span aria-hidden="true" className="home-hero-indicator size-2 rounded-full bg-accent" />
              EXPLORE SOUTH AFRICA
            </span>
            <span className="hidden items-center gap-1.5 text-xs font-medium text-white/90 sm:flex">
              <Compass aria-hidden="true" className="text-accent" size={14} />
              <span>Discover with local guides</span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="home-hero-title mt-6 w-full max-w-none font-display text-4xl font-medium leading-[1.02] tracking-tight sm:text-6xl md:whitespace-nowrap md:text-7xl lg:text-[clamp(5rem,8.4vw,7.5rem)]">
            Through <span className="home-hero-title-accent whitespace-nowrap italic">Local Eyes.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg md:text-xl">
            Discover locally led journeys, from Franschhoek vineyards and Cape coastlines to Greater Kruger wildlife and the stories that make each place distinct.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild className="bg-accent text-white shadow-2xl shadow-accent/30 hover:bg-accent/90" size="xl">
              <Link href="/experiences">
                Search Experiences
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </Button>
            <Button asChild className="border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20" size="xl" variant="outline">
              <Link href="/guides">Meet Local Guides</Link>
            </Button>
          </div>
        </FadeIn>

        {/* Floating glass search bar */}
        <FadeInScale className="mt-14 w-full max-w-5xl">
          <div
            aria-label="Search tours and experiences"
            role="search"
            className="home-search grid gap-2 rounded-3xl border p-3 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:grid-cols-2 lg:grid-cols-[1.4fr_1.1fr_1fr_auto] lg:items-center lg:rounded-full lg:p-2.5"
          >
            {/* Destination */}
            <label className="home-search-field flex min-h-14 items-center gap-3.5 rounded-2xl px-5 lg:pl-7" htmlFor="search-destination">
              <div aria-hidden="true" className="home-search-icon grid size-11 shrink-0 place-items-center rounded-full">
                <MapPin aria-hidden="true" size={20} />
              </div>
              <div className="grid min-w-0 flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/65">Destination</span>
                <input
                  autoComplete="off"
                  className="home-search-input w-full border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none placeholder:text-white/55 focus-visible:ring-0"
                  id="search-destination"
                  placeholder="Where do you want to go?"
                  type="text"
                />
              </div>
            </label>

            {/* Date */}
            <label className="home-search-field flex min-h-14 items-center gap-3.5 rounded-2xl border-t border-white/10 px-5 sm:border-t-0 lg:border-l lg:border-t-0" htmlFor="search-date">
              <div aria-hidden="true" className="home-search-icon grid size-11 shrink-0 place-items-center rounded-full">
                <CalendarDays aria-hidden="true" size={20} />
              </div>
              <div className="grid min-w-0 flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/65">When</span>
                <input
                  aria-label="Experience date"
                  className="home-search-input w-full border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none focus-visible:ring-0"
                  id="search-date"
                  type="date"
                />
              </div>
            </label>

            {/* Guests */}
            <label className="home-search-field flex min-h-14 items-center gap-3.5 rounded-2xl border-t border-white/10 px-5 lg:border-l lg:border-t-0" htmlFor="search-guests">
              <div aria-hidden="true" className="home-search-icon grid size-11 shrink-0 place-items-center rounded-full">
                <UsersRound aria-hidden="true" size={20} />
              </div>
              <div className="grid min-w-0 flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/65">Travellers</span>
                <select
                  aria-label="Number of guests"
                  className="home-search-input w-full appearance-none border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none focus-visible:ring-0"
                  defaultValue=""
                  id="search-guests"
                >
                  <option className="bg-[#101713] text-white" disabled value="">Select guests</option>
                  <option className="bg-[#101713] text-white">1 guest</option>
                  <option className="bg-[#101713] text-white">2 guests</option>
                  <option className="bg-[#101713] text-white">3–5 guests</option>
                  <option className="bg-[#101713] text-white">6+ group</option>
                </select>
              </div>
            </label>

            {/* Search Button (Gold Accent) */}
            <Button
              aria-label="Search experiences"
              className="home-search-submit flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent px-8 text-base font-semibold text-white shadow-xl shadow-accent/25 transition-all duration-300 hover:scale-[1.02] hover:bg-accent/90 active:scale-95 lg:rounded-full"
              size="lg"
            >
              <Search aria-hidden="true" size={20} />
              <span>Search</span>
            </Button>
          </div>
        </FadeInScale>

        {/* Quick Highlights */}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/80">
          <span className="font-semibold uppercase tracking-wider text-accent">Explore these places:</span>
          {["Cape Town Peninsula", "Greater Kruger", "Stellenbosch Cellars", "Soweto Murals", "Drakensberg Escarpment"].map((place) => (
            <Link
              className="rounded-full bg-white/10 px-3.5 py-1 text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
              href="/destinations"
              key={place}
            >
              {place}
            </Link>
          ))}
        </div>
      </Container>

      {/* Animated Live Statistics Bar */}
      <div className="home-hero-stats border-t border-white/15 bg-black/40 backdrop-blur-lg">
        <Container className="grid grid-cols-2 gap-6 py-6 sm:grid-cols-4">
          <div className="text-center sm:text-left">
            <p className="font-display text-2xl font-bold tracking-tight text-[#f4cd9f] sm:text-3xl">{guides.length}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-white/75">Guide Profiles</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-display text-2xl font-bold tracking-tight text-[#f4cd9f] sm:text-3xl">{experiences.length}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-white/75">Listed Experiences</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-display text-2xl font-bold tracking-tight text-[#f4cd9f] sm:text-3xl">{provinces.length}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-white/75">Provinces in the Guide</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-display text-2xl font-bold tracking-tight text-[#f4cd9f] sm:text-3xl">PayFast</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-white/75">PayFast Checkout</p>
          </div>
        </Container>
      </div>

      <a
        aria-label="Scroll to discover destinations"
        className="absolute bottom-24 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70 transition-colors hover:text-white md:flex"
        href="#popular-destinations"
      >
        Scroll to discover <ArrowDown aria-hidden="true" size={14} />
      </a>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-12 flex flex-col gap-4 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <Button asChild className="self-start sm:self-auto" variant="outline">
          <Link href={href}>
            {linkLabel}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

{/* Asymmetrical Bento Destinations Layout */}
function PopularDestinationsSection() {
  const [featured, second, third, fourth] = destinations;

  return (
    <Section className="bg-background" id="popular-destinations" spacing="spacious">
      <Container>
        <SectionHeading
          description="From soaring basalt amphitheatres and sun-drenched vineyards to untamed big-game savannas, begin where your curiosity calls."
          eyebrow="Popular Destinations"
          href="/destinations"
          linkLabel="All Destinations"
          title="Landscapes That Stay With You"
        />

        <div className="grid gap-6 lg:grid-cols-12 lg:grid-rows-2">
          {/* Large Hero Card - Spans 7 columns & 2 rows */}
          <div className="lg:col-span-7 lg:row-span-2">
            <FadeIn className="h-full">
              <div className="group relative isolate flex h-full min-h-[460px] overflow-hidden rounded-3xl bg-muted text-white">
                <Image
                  alt={imageAlt(featured.imageDescription, `${featured.name}, ${featured.province}`)}
                  className="-z-10 object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  src={featured.image}
                  unoptimized
                />
                <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="relative z-30 mt-auto flex flex-col justify-end p-8 sm:p-10">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#f4cd9f]">
                    <MapPin aria-hidden="true" size={14} />
                    {featured.province}
                  </span>
                  <h3 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
                    {featured.name}
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
                    {featured.description}
                  </p>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                      Local experiences
                    </span>
                    <Button asChild className="bg-white text-foreground hover:bg-white/90">
                      <Link href="/destinations">Explore {featured.name} →</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Top Right Card - Spans 5 columns */}
          <div className="lg:col-span-5">
            <FadeIn className="h-full">
              <DestinationCard {...second} href="/destinations" />
            </FadeIn>
          </div>

          {/* Bottom Right 2 Cards - Spans 2.5 columns each */}
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-5">
            <FadeIn>
              <DestinationCard {...third} href="/destinations" />
            </FadeIn>
            <FadeIn>
              <DestinationCard {...fourth} href="/destinations" />
            </FadeIn>
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm sm:mt-16 sm:p-8">
          <div className="mb-5 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Explore by Province</p>
            <h3 className="mt-2 font-display text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              Find your South Africa
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Browse destination regions across all nine provinces. Experience counts reflect current listings; provinces without listings remain open for future discovery.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
            {provinces.map((province) => {
              const count = experiences.filter((experience) => experience.provinces.includes(province)).length;
              return (
                <Link
                  className="group flex min-h-14 items-center justify-between gap-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
                  href={`/experiences?province=${encodeURIComponent(province)}`}
                  key={province}
                >
                  <span className="min-w-0">{province}</span>
                  <span className="shrink-0 text-[10px] font-medium text-muted-foreground sm:text-xs">
                    {count > 0 ? `${count} listed` : "No listings yet"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}

{/* Editorial Storytelling Break */}
function EditorialStorytellingBreak() {
  return (
    <Section className="bg-[#122219] text-white" spacing="spacious">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <SlideIn direction="left">
            <span className="inline-block rounded-full bg-accent/20 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.22em] text-accent">
              Our Philosophy
            </span>
            <h2 className="mt-5 font-display text-3xl font-medium leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
              We don&apos;t just show you South Africa. <br />
              <span className="italic text-[#f4cd9f]">We introduce you to it.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-white/80 sm:text-lg">
              South Africa is vast, storied, and intensely personal. The memories that linger are stories shared over rooibos tea in Bo-Kaap, the quiet stillness of tracking a leopard with a Kruger ranger, and the laughter shared with a township artist in Soweto.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-white/15 pt-6 text-xs font-semibold uppercase tracking-wider text-white/70">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-accent" size={16} /> Local perspectives
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-accent" size={16} /> Independent local hosts
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-accent" size={16} /> Small-Group Intimacy
              </div>
            </div>
          </SlideIn>

          <SlideIn className="relative isolate aspect-[4/3] overflow-hidden rounded-3xl" direction="right">
            <Image
              alt="Cape Town harbour with boats moored beneath Table Mountain"
              className="object-cover"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              src="/images/south-africa/cape-town-harbour.jpg"
              unoptimized
            />
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 z-30 flex items-center justify-between text-xs text-white/90">
              <span className="font-semibold tracking-wide">Cape Town Harbour · Western Cape</span>
              <span className="italic">Table Mountain in view</span>
            </div>
          </SlideIn>
        </div>
      </Container>
    </Section>
  );
}

{/* Featured Experiences with Asymmetrical Highlight */}
function FeaturedExperiencesSection() {
  return (
    <Section className="bg-secondary/40" spacing="spacious">
      <Container>
        <SectionHeading
          description="Handpicked small-group journeys, private wine tastings, and wildlife encounters led by vetted regional masters."
          eyebrow="Featured Experiences"
          href="/experiences"
          linkLabel="Explore All Experiences"
          title="Handcrafted Itineraries"
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {experiences.slice(0, 4).map((experience, index) => (
            <FadeIn key={experience.slug} transition={{ delay: index * 0.08 }}>
              <ExperienceCard {...experience} href="/experiences" />
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}

{/* Meet Local Guides */}
function TopGuidesSection() {
  return (
    <Section spacing="spacious">
      <Container>
        <SectionHeading
          description="Meet guides who share their interests in wildlife, culture, food, wine, and the places they know."
          eyebrow="Featured Guides"
          href="/guides"
          linkLabel="Meet All Guides"
          title="Meet Your South African Hosts"
        />

        <div className="grid gap-6 md:grid-cols-3">
          {guides.slice(0, 3).map((guide, index) => (
            <FadeIn key={guide.slug} transition={{ delay: index * 0.08 }}>
              <GuideCard href="/guides" {...guide} />
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}

{/* Travel Categories */}
function TravelCategoriesSection() {
  return (
    <Section className="border-y border-border/60 bg-card" spacing="spacious">
      <Container>
        <SectionHeading
          description="Tailor your South African holiday around what moves you most: wilderness, culinary heritage, or outdoor thrills."
          eyebrow="Categories"
          href="/experiences"
          linkLabel="All 10 Categories"
          title="Follow Your Travel Passions"
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => {
            const Icon = categoryIcons[category.icon] ?? Sparkles;
            return (
              <Link
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg no-underline"
                href="/experiences"
                key={category.name}
              >
                <div>
                  <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon aria-hidden="true" size={22} />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{category.description}</p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span>Browse tours</span>
                  <ArrowRight aria-hidden="true" size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

{/* Trust & Peace of Mind */}
function TrustPillarsSection() {
  return (
    <Section spacing="spacious">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.22em] text-primary">
            Peace of Mind
          </span>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Book South Africa With Confidence
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Review guide profiles, experience details, payment steps, and the terms for each booking before you decide.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trustPillars.map(({ icon: Icon, title, description }) => (
            <div
              className="group rounded-3xl border border-border/70 bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)]"
              key={title}
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon aria-hidden="true" size={22} />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight text-foreground">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

{/* How It Works */}
function HowItWorksSection() {
  return (
    <Section className="bg-[#14261c] text-white" spacing="spacious">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-accent/20 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.22em] text-accent">
            How It Works
          </span>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
            Four Steps to Somewhere Special
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/75 sm:text-lg">
            Browse local experiences, review the details, and choose the journey that feels right for you.
          </p>
        </div>

        <ol className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorksSteps.map((step, index) => (
            <li className="relative border-t border-white/20 pt-6" key={step.step}>
              {index < howItWorksSteps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-px left-0 hidden h-px w-full translate-x-8 bg-gradient-to-r from-accent/80 to-transparent lg:block"
                />
              ) : null}
              <span className="font-display text-2xl font-bold tracking-wider text-accent">{step.step}</span>
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/75">{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

{/* Customer Stories */}
function CustomerStoriesSection() {
  return (
    <Section className="bg-secondary/40" spacing="spacious">
      <Container>
        <SectionHeading
          description="Authentic feedback from international and domestic guests who journeyed with our local hosts."
          eyebrow="Guest Testimonials"
          title="Journeys to Remember"
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((testimonial) => (
            <div
              className="flex flex-col justify-between rounded-3xl border border-border/70 bg-card p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              key={testimonial.name}
            >
              <div>
                <div aria-label={`${testimonial.rating} out of 5 stars`} className="flex gap-1 text-accent">
                  {Array.from({ length: testimonial.rating }, (_, i) => (
                    <Star aria-hidden="true" className="fill-current" key={i} size={15} />
                  ))}
                </div>
                <blockquote className="mt-5 font-display text-lg font-medium leading-relaxed text-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
              </div>
              <div className="mt-8 border-t border-border/60 pt-4">
                <p className="font-display text-base font-semibold text-foreground">{testimonial.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {testimonial.origin} <span aria-hidden="true">·</span> {testimonial.experience}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

{/* Become a Guide Callout */}
function BecomeGuideSection() {
  return (
    <Section spacing="default">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1F5E4A] via-[#174A38] to-[#103628] px-8 py-16 text-white sm:px-14 sm:py-20 lg:px-20">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 -z-10 size-96 rounded-full border border-white/10 sm:size-[36rem]"
          />
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-10 -z-10 size-72 rounded-full border border-accent/20 sm:size-[26rem]"
          />

          <div className="max-w-2xl">
            <span className="inline-block rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              Host Community
            </span>
            <h2 className="mt-5 font-display text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-5xl">
              Turn your hometown into someone&apos;s favourite memory.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              Set your own schedule, build an independent livelihood, and welcome travellers who genuinely value local heritage and authentic hospitality.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild className="bg-accent text-white shadow-xl hover:bg-accent/90" size="lg">
                <Link href="/become-a-guide">
                  Become a Nomsa Guide
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
              </Button>
              <Button asChild className="border-white/30 text-white hover:bg-white/15" size="lg" variant="outline">
                <Link href="/register?role=GUIDE">Apply Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

{/* Newsletter */}
function HomeNewsletterSection() {
  return (
    <Section className="pb-16 pt-4">
      <Container>
        <div className="grid gap-8 rounded-3xl border border-border/80 bg-card p-8 sm:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">Stay Inspired</p>
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              South Africa, delivered softly to your inbox.
            </h2>
            <p className="mt-3.5 max-w-xl text-base leading-relaxed text-muted-foreground">
              Seasonal whale migrations, blooming wildflower alerts, and secret culinary walks. Curated stories, never spam.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </Container>
    </Section>
  );
}

export function HomePage() {
  return (
    <>
      <HomeHero />
      <PopularDestinationsSection />
      <EditorialStorytellingBreak />
      <FeaturedExperiencesSection />
      <TopGuidesSection />
      <TravelCategoriesSection />
      <TrustPillarsSection />
      <HowItWorksSection />
      <CustomerStoriesSection />
      <BecomeGuideSection />
      <HomeNewsletterSection />
    </>
  );
}