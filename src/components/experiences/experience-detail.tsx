"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Globe,
  Heart,
  HelpCircle,
  Info,
  MapPin,
  Share2,
  Star,
  ThumbsUp,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { ExperienceCard } from "@/src/components/cards/experience-card";
import { Container } from "@/src/components/layout/container";
import { Section } from "@/src/components/layout/section";
import { formatCurrency } from "@/src/lib/format";
import { experiences, guides } from "@/src/data/public-site";
import type { ExperienceDetailData } from "@/src/data/experience-details";

export function ExperienceDetail({ data }: { data: ExperienceDetailData }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const guide = data.guideSlug ? guides.find((candidate) => candidate.slug === data.guideSlug) : undefined;
  const guideExperiences = guide
    ? experiences.filter((experience) => experience.slug !== data.slug && experience.guide.name === guide.name)
    : [];
  const experienceRegions = data.province.split(" & ").filter(Boolean);
  const experienceLocation = [data.destination, data.province].filter(Boolean).join(", ") || "Location not listed";
  const matchingSpecialties = guide?.specialties?.filter(
    (specialty) => specialty.toLowerCase() === data.category.toLowerCase(),
  ) ?? [];
  const guideSharesExperienceRegion = Boolean(
    guide && experienceRegions.some((region) => guide.location?.includes(region)),
  );
  const similarExperiences = experiences
    .filter((experience) => {
      if (experience.slug === data.slug) return false;
      return experience.provinces.some((province) => experienceRegions.includes(province)) || experience.category === data.category;
    })
    .slice(0, 3);

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  }

  return (
    <article className="bg-background text-foreground">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-border/60 bg-card/60 py-3 text-xs">
        <Container className="flex items-center gap-2 text-muted-foreground">
          <Link className="hover:text-primary transition-colors" href="/">
            Home
          </Link>
          <ChevronRight size={13} />
          <Link className="hover:text-primary transition-colors" href="/experiences">
            Experiences
          </Link>
          <ChevronRight size={13} />
          <span className="text-foreground font-medium truncate max-w-xs">{data.title}</span>
        </Container>
      </div>

      {/* Main Experience Header */}
      <Section className="pb-6 pt-8 sm:pb-8">
        <Container>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  {data.category}
                </span>
                {data.destination || data.province ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                    <MapPin aria-hidden="true" size={13} className="text-primary" />
                    {[data.destination, data.province].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
                {data.title}
              </h1>
              {data.tagline ? <p className="mt-3 text-base text-muted-foreground sm:text-lg">{data.tagline}</p> : null}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                aria-label="Share experience"
                className="rounded-full"
                onClick={handleShare}
                size="icon"
                variant="outline"
              >
                <Share2 size={16} />
              </Button>
              <Button
                aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                aria-pressed={isWishlisted}
                className="rounded-full"
                onClick={() => setIsWishlisted(!isWishlisted)}
                size="icon"
                variant="outline"
              >
                <Heart className={isWishlisted ? "fill-highlight text-highlight" : ""} size={16} />
              </Button>
            </div>
          </div>
          {copiedShare ? (
            <p aria-live="polite" className="mt-2 text-xs font-semibold text-primary">
              Link copied to clipboard!
            </p>
          ) : null}

          {/* Key Facts Strip */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-border/60 py-4 text-xs font-medium text-foreground">
            {data.reviewCount > 0 && data.rating > 0 ? (
              <span className="flex items-center gap-1.5 font-semibold">
                <Star className="fill-accent text-accent" size={15} />
                {data.rating.toFixed(1)}
                <span className="font-normal text-muted-foreground">({data.reviewCount} guest reviews)</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Guest review summary unavailable</span>
            )}
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock size={15} className="text-primary" /> {data.duration}
            </span>
            {data.groupSize ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users size={15} className="text-primary" /> {data.groupSize}
              </span>
            ) : null}
            {data.languages?.length ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Globe size={15} className="text-primary" /> {data.languages.join(", ")}
              </span>
            ) : null}
          </div>
        </Container>
      </Section>

      {/* Hero Image Gallery */}
      <section className="pb-10">
        <Container>
          <div className="grid gap-3 lg:grid-cols-12">
            {/* Primary Large Image */}
            <button
              aria-label={`View photo ${activeImageIndex + 1} of ${data.images.length}: ${data.images[activeImageIndex]?.caption || data.title}`}
              className="group relative aspect-[16/10] overflow-hidden rounded-3xl border-0 bg-muted p-0 text-left shadow-xl shadow-black/10 ring-1 ring-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 lg:col-span-8"
              onClick={() => setModalOpen(true)}
              type="button"
            >
              <Image
                alt={data.images[activeImageIndex]?.caption || data.title}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
                src={data.images[activeImageIndex]?.url || data.images[0].url}
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 motion-reduce:transition-none" />
              <span className="absolute bottom-5 left-5 max-w-[55%] text-left text-xs font-medium leading-relaxed text-white drop-shadow sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 motion-reduce:transition-none">
                {data.images[activeImageIndex]?.caption}
              </span>
              <span
                aria-hidden="true"
                className="absolute bottom-5 right-5 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all group-hover:bg-black/80"
              >
                View Full Gallery ({data.images.length})
              </span>
            </button>

            {/* Thumbnail Strip */}
            <div className="grid grid-cols-4 gap-3 lg:grid-cols-1 lg:col-span-4">
              {data.images.slice(0, 4).map((img, idx) => (
                <button
                  aria-label={`Show photo ${idx + 1}: ${img.caption}`}
                  aria-pressed={activeImageIndex === idx}
                  className={`group relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted p-0 text-left border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all ${
                    activeImageIndex === idx ? "border-primary" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  key={img.url}
                  onClick={() => setActiveImageIndex(idx)}
                  type="button"
                >
                  <Image
                    alt={img.caption}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    fill
                    sizes="(max-width: 1024px) 25vw, 33vw"
                    src={img.url}
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Two Column Layout: Main Content & Sticky Booking Sidebar */}
      <Section className="py-6 sm:py-10">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            {/* Left 8 Columns: Details, Highlights, Itinerary, Guide, FAQ */}
            <div className="space-y-10 lg:col-span-8 sm:space-y-12">
              {/* Host Snippet Card */}
              <div className="host-intro glass-panel glass-panel--subtle flex flex-col items-stretch gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                {guide ? (
                  <>
                    <div className="flex min-w-0 items-center gap-4">
                      <Avatar className="size-16 rounded-2xl border-2 border-primary/20 shadow-md">
                        {guide.image ? <AvatarImage alt={guide.name} src={guide.image} /> : null}
                        <AvatarFallback className="rounded-2xl text-base font-bold text-primary">
                          {guide.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Your host for this experience</p>
                        <h2 className="mt-1 font-display text-lg font-semibold">Hosted by {guide.name}</h2>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                          <MapPin aria-hidden="true" size={12} />
                          <span>{guide.location?.trim() || "Guide location not listed"}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {guide.yearsExperience > 0
                              ? `${guide.yearsExperience} ${guide.yearsExperience === 1 ? "year" : "years"} of experience`
                              : "Years of experience not listed"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <Button asChild className="self-start sm:self-auto" size="sm" variant="outline">
                      <a href="#host-profile">Meet your guide</a>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Host profile details are not available for this experience yet.</p>
                )}
              </div>

              {/* Overview */}
              {data.overview ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">The experience</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">A sense of place</h2>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{data.overview}</p>
                </div>
              ) : null}

              {/* Highlights */}
              {data.highlights.length ? <div className="glass-panel glass-panel--subtle rounded-3xl border border-border/70 bg-card p-7 shadow-sm">
                <h2 className="font-display text-xl font-semibold tracking-tight">Experience Highlights</h2>
                <ul className="mt-5 space-y-3.5">
                  {data.highlights.map((highlight) => (
                    <li className="flex items-start gap-3 text-sm text-foreground" key={highlight}>
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div> : null}

              {/* Included / Excluded Split */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="glass-panel glass-panel--subtle rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
                  <h3 className="font-display text-lg font-semibold text-foreground">What&apos;s Included</h3>
                  {data.included.length ? (
                    <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                      {data.included.map((item) => (
                        <li className="flex items-start gap-2.5" key={item}>
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Inclusions have not been provided for this listing.</p>
                  )}
                </div>
                <div className="glass-panel glass-panel--subtle rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
                  <h3 className="font-display text-lg font-semibold text-foreground">What&apos;s Excluded</h3>
                  {data.excluded.length ? (
                    <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                      {data.excluded.map((item) => (
                        <li className="flex items-start gap-2.5" key={item}>
                          <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Exclusions have not been provided for this listing.</p>
                  )}
                </div>
              </div>

              {/* Itinerary Timeline */}
              {data.itinerary.length ? (
                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">Experience Itinerary</h2>
                  <div className="ml-3 mt-6 space-y-6 border-l-2 border-primary/20 pl-6">
                    {data.itinerary.map((stop) => (
                      <div className="relative" key={stop.title}>
                        <span className="absolute -left-[31px] top-1 grid size-4 place-items-center rounded-full bg-primary ring-4 ring-background" />
                        {stop.time ? (
                          <span className="text-xs font-bold uppercase tracking-wider text-primary">{stop.time}</span>
                        ) : null}
                        <h3 className="mt-1 font-display text-lg font-semibold">{stop.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{stop.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-border/70 bg-card p-6">
                  <h2 className="font-display text-2xl font-semibold tracking-tight">Experience itinerary</h2>
                  <p className="mt-2 text-sm text-muted-foreground">An itinerary has not been provided for this listing yet.</p>
                </div>
              )}

              {/* Meeting Point */}
              <div className="glass-panel glass-panel--subtle rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-7">
                <h2 className="font-display text-xl font-semibold tracking-tight">Meeting Point &amp; Logistics</h2>
                {data.meetingPoint ? (
                  <>
                    <p className="mt-2 text-sm font-medium text-foreground">{data.meetingPoint.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{data.meetingPoint.address}</p>
                    {data.meetingPoint.coordinates ? (
                      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />
                        Coordinates: {data.meetingPoint.coordinates}
                      </p>
                    ) : null}
                    {data.meetingPoint.notes ? (
                      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
                        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{data.meetingPoint.notes}</span>
                      </div>
                    ) : null}
                    {data.meetingPoint.coordinates ? (
                      <a
                        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.meetingPoint.coordinates)}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <MapPin aria-hidden="true" size={14} /> Open location in Maps
                      </a>
                    ) : null}
                    <div className="mt-5 flex items-start gap-2.5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>Confirm the meeting details with the experience host before setting out.</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Meeting point details are not listed for this experience yet. Confirm the location before booking.
                  </p>
                )}
              </div>

              {/* Detailed Guide Profile Card */}
              {guide ? (
                <section className="host-profile glass-panel glass-panel--subtle rounded-3xl border border-border/70 bg-secondary/40 p-6 shadow-sm sm:p-8" id="host-profile">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                  <Avatar className="size-24 rounded-3xl border-2 border-primary/20 shadow-lg">
                    {guide.image ? <AvatarImage alt={guide.name} src={guide.image} /> : null}
                    <AvatarFallback className="rounded-3xl text-2xl font-bold text-primary">
                      {guide.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Meet your host</p>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-display text-2xl font-semibold tracking-tight">Meet {guide.name}</h2>
                      {guide.rating > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
                          <Star aria-hidden="true" className="size-3.5 fill-accent text-accent" />
                          Guide rating {guide.rating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Guide rating summary unavailable</span>
                      )}
                    </div>

                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <MapPin aria-hidden="true" className="size-3 shrink-0 text-primary" />
                      <span>{guide.location?.trim() || "Guide location not listed"}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {guide.yearsExperience > 0
                          ? `${guide.yearsExperience} ${guide.yearsExperience === 1 ? "year" : "years"} of experience`
                          : "Years of experience not listed"}
                      </span>
                    </p>

                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {guide.biography?.trim() || "A biography has not been provided for this guide yet."}
                    </p>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Languages</h3>
                        <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                          <Globe aria-hidden="true" className="size-4 shrink-0 text-primary" />
                          {guide.languages?.length ? guide.languages.join(" · ") : "Languages not listed"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Specialties</h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {guide.specialties?.length ? guide.specialties.map((specialty) => (
                            <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs font-medium text-foreground" key={specialty}>
                              {specialty}
                            </span>
                          )) : <span className="text-sm text-muted-foreground">Specialties not listed</span>}
                        </div>
                      </div>
                    </div>

                    <div className="host-profile__connection mt-6 rounded-2xl border border-border/50 bg-card/65 p-4 sm:p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">A guide for this place</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        This {data.category.toLowerCase()} experience is listed in {experienceLocation}. {guide.name} is based in {guide.location?.trim() || "a location not listed"}.
                      </p>
                      {guideSharesExperienceRegion ? (
                        <p className="mt-2 text-sm font-medium text-foreground">
                          The guide&apos;s listed base is in the same region as this experience.
                        </p>
                      ) : null}
                      {matchingSpecialties.length ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Listed specialty{matchingSpecialties.length > 1 ? "ies" : ""} aligned with this experience:{" "}
                          <span className="font-medium text-foreground">{matchingSpecialties.join(" · ")}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
                {guideExperiences.length ? (
                  <div className="mt-7 border-t border-border/60 pt-5">
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">More with {guide.name}</h3>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {guideExperiences.map((experience) => (
                        <li key={experience.slug}>
                          <Link
                            className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-card/75 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                            href={`/experiences/${experience.slug}`}
                          >
                            <span className="line-clamp-2">{experience.title}</span>
                            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-primary" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-7 border-t border-border/60 pt-5">
                    <p className="text-sm text-muted-foreground">No other experiences with this guide are listed yet.</p>
                  </div>
                )}
                </section>
              ) : (
                <section className="rounded-3xl border border-border/70 bg-card p-6" id="host-profile">
                  <h2 className="font-display text-xl font-semibold">Guide profile</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Guide details have not been provided for this experience yet.</p>
                </section>
              )}

              {/* Guest Reviews Section */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight">
                      Traveller Reviews
                    </h2>
                    {data.reviewCount > 0 && data.rating > 0 ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                        <Star className="size-4 fill-accent text-accent" />
                        <span className="font-bold">{data.rating.toFixed(1)}</span> out of 5 · {data.reviewCount} guest reviews
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">Guest review summary is not available for this experience yet.</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {data.reviews.map((rev) => (
                    <div
                      className="glass-panel glass-panel--subtle flex flex-col justify-between rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
                      key={rev.id}
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 border border-border">
                            <AvatarImage alt={rev.name} src={rev.avatar} />
                            <AvatarFallback>{rev.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{rev.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {rev.country} · {rev.date}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex text-accent">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star className="size-3.5 fill-current" key={i} />
                          ))}
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </div>

                      <div className="mt-5 border-t border-border/50 pt-3 flex items-center gap-1 text-xs text-muted-foreground">
                        <ThumbsUp size={12} />
                        <span>Helpful ({rev.helpfulCount})</span>
                      </div>
                    </div>
                  ))}
                </div>
                {!data.reviews.length ? (
                  <p className="rounded-2xl border border-border/70 bg-card/70 p-5 text-sm text-muted-foreground">
                    Individual review comments are not available on this page yet.
                  </p>
                ) : null}
              </section>

              {/* FAQ Accordion */}
              {data.faqs.length ? (
                <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
                  <h2 className="font-display text-2xl font-semibold tracking-tight">Frequently Asked Questions</h2>
                  <div className="mt-6 divide-y divide-border/60">
                    {data.faqs.map((faq) => (
                      <div className="py-4 first:pt-0 last:pb-0" key={faq.question}>
                        <h3 className="flex items-center gap-2 text-base font-semibold">
                          <HelpCircle className="size-4 shrink-0 text-primary" />
                          {faq.question}
                        </h3>
                        <p className="mt-2 pl-6 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right 4 Columns: Sticky Booking Sidebar (UI Only) */}
            <aside className="lg:col-span-4">
              <div className="glass-panel glass-panel--floating sticky top-28 rounded-3xl border border-border/80 bg-card p-6 shadow-xl shadow-black/5 dark:shadow-none sm:p-7">
                {/* Price Display */}
                <div className="flex items-baseline justify-between border-b border-border/60 pb-5">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider block">From</span>
                    <span className="font-display text-3xl font-bold text-foreground">
                      {formatCurrency(data.price)}
                    </span>
                    <span className="text-xs text-muted-foreground"> / guest</span>
                  </div>
                  {data.reviewCount > 0 && data.rating > 0 ? (
                    <span className="flex items-center gap-1 text-xs font-semibold">
                      <Star className="size-3.5 fill-accent text-accent" />
                      {data.rating.toFixed(1)} ({data.reviewCount})
                    </span>
                  ) : (
                    <span className="max-w-28 text-right text-xs text-muted-foreground">Rating summary unavailable</span>
                  )}
                </div>

                <p className="mt-4 rounded-xl bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
                  Price shown per guest. Select your date and traveller count in the next step to review the booking total.
                </p>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p>
                    Booking for <span className="font-medium text-foreground">{data.title}</span>
                  </p>
                  <p>
                    {guide ? `Hosted by ${guide.name}` : "Host details not listed"} · {experienceLocation}
                  </p>
                </div>

                {/* Book Now Button */}
                <Button
                  asChild
                  className="mt-5 h-13 w-full rounded-full bg-accent text-white font-semibold text-base shadow-xl shadow-accent/25 transition-transform hover:-translate-y-0.5 hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                  size="lg"
                >
                  <Link href={`/experiences/${data.slug}/book`}>Choose date &amp; travellers</Link>
                </Button>

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Review the booking details before continuing to PayFast checkout.
                </p>

                <div className="mt-5 space-y-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{data.cancellationPolicy || "Cancellation terms are not listed for this experience. Contact Nomsa Tour Guides before booking."}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="size-4 text-primary shrink-0" />
                    <span>Payment details are entered on PayFast&apos;s checkout.</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      {/* Similar Experiences Carousel */}
      <Section className="border-t border-border/60 bg-secondary/30" spacing="spacious">
        <Container>
          <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Discover More</p>
              <h2 className="mt-1 font-display text-3xl font-medium tracking-tight">Similar Journeys You May Love</h2>
            </div>
            <Button asChild className="self-start" variant="outline">
              <Link href="/experiences">Browse All Experiences →</Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similarExperiences.map((exp) => (
              <ExperienceCard
                href={`/experiences/${exp.slug}`}
                key={`similar-${exp.slug}`}
                {...exp}
              />
            ))}
          </div>
        </Container>
      </Section>

      {/* Fullscreen Photo Modal */}
      {modalOpen ? (
        <div
          aria-label="Experience photo gallery"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          role="dialog"
        >
          <button
            aria-label="Close photo modal"
            className="absolute top-6 right-6 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            onClick={() => setModalOpen(false)}
            type="button"
          >
            <X size={20} />
          </button>
          <div className="relative aspect-[16/10] max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-3xl">
            <Image
              alt={data.images[activeImageIndex]?.caption || data.title}
              className="object-contain"
              fill
              src={data.images[activeImageIndex]?.url || data.images[0].url}
              unoptimized
            />
          </div>
          <div className="absolute bottom-6 flex gap-2">
            {data.images.map((img, i) => (
              <button
                aria-label={`Show photo ${i + 1}: ${img.caption}`}
                aria-pressed={activeImageIndex === i}
                className={`size-3 rounded-full transition-all ${
                  activeImageIndex === i ? "bg-accent scale-125" : "bg-white/40"
                }`}
                key={img.url}
                onClick={() => setActiveImageIndex(i)}
                type="button"
              />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
