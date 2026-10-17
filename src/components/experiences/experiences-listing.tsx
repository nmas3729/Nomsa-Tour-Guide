"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  CalendarDays,
  Compass,
  Filter,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ExperienceCard } from "@/src/components/cards/experience-card";
import { Container } from "@/src/components/layout/container";
import { Section } from "@/src/components/layout/section";
import { GlassPanel } from "@/src/components/ui/glass-panel";
import { categories, destinations, experiences, provinces } from "@/src/data/public-site";
import { cn } from "@/src/lib/utils";

const sortOptions = [
  { label: "Most Popular", value: "popular" },
  { label: "Highest Rated", value: "rating" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

const languageOptions = ["English", "isiXhosa", "isiZulu", "Afrikaans", "French", "German"];

export function ExperiencesListing() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [provinceSelection, setProvinceSelection] = useState<{ query: string; province: string } | null>(null);
  const requestedProvince = searchParams.get("province");
  const urlProvince = provinces.find((province) => province === requestedProvince) ?? "";
  const selectedProvince = provinceSelection?.query === queryString ? provinceSelection.province : urlProvince;
  const setSelectedProvince = (province: string) => setProvinceSelection({ query: queryString, province });
  const [selectedSort, setSelectedSort] = useState<string>("popular");
  const [showMap, setShowMap] = useState<boolean>(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<number>(3000);
  const [familyFriendly, setFamilyFriendly] = useState<boolean>(false);
  const [privateTour, setPrivateTour] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const filterDestinationId = useId();
  const filterDurationId = useId();

  // Filter experiences based on state
  const filteredExperiences = experiences.filter((item) => {
    if (selectedCategory !== "All" && item.category !== selectedCategory) {
      return false;
    }
    if (selectedDestination && !item.destination.toLowerCase().includes(selectedDestination.toLowerCase())) {
      return false;
    }
    if (selectedProvince && !item.provinces.includes(selectedProvince)) {
      return false;
    }
    if (item.price > priceRange) {
      return false;
    }
    return true;
  });
  const sortedExperiences = [...filteredExperiences].sort((first, second) => {
    switch (selectedSort) {
      case "rating":
        return second.rating - first.rating || second.reviewCount - first.reviewCount;
      case "price_asc":
        return first.price - second.price;
      case "price_desc":
        return second.price - first.price;
      case "popular":
      default:
        return second.reviewCount - first.reviewCount;
    }
  });

  return (
    <div className="experiences-page bg-background text-foreground">
      {/* Editorial Page Header */}
      <section className="experiences-hero relative isolate overflow-hidden border-b border-border/70 py-16 text-white sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="experiences-kicker inline-block rounded-full px-4 py-1 text-xs font-bold uppercase tracking-[0.24em] text-accent">
              South African Journeys
            </span>
            <h1 className="experiences-heading mt-4 font-display text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
              Curated Local Experiences
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
              Discover South Africa through its nine provinces: coastal wilderness, mountain air, wildlife, living heritage, and memorable local food.
            </p>
          </div>

          {/* Floating Search Bar */}
          <div
            aria-label="Search and filter experiences"
            className="experiences-search mx-auto mt-12 grid max-w-5xl gap-2.5 rounded-3xl border p-3 text-white shadow-2xl backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-center lg:rounded-full lg:p-2.5"
            role="search"
          >
            {/* Destination */}
            <div className="experiences-search-field flex min-h-12 items-center gap-3 px-4 lg:pl-6">
              <MapPin aria-hidden="true" className="experiences-search-icon shrink-0" size={18} />
              <div className="grid min-w-0 flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/60" htmlFor="filter-destination">
                  Where
                </label>
                <input
                  className="experiences-search-input w-full border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none placeholder:text-white/50 focus-visible:ring-0"
                  id="filter-destination"
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  placeholder="Any destination"
                  type="text"
                  value={selectedDestination}
                />
              </div>
            </div>

            {/* Date */}
            <div className="experiences-search-field flex min-h-12 items-center gap-3 border-t border-white/10 px-4 sm:border-t-0 lg:border-l lg:border-t-0">
              <CalendarDays aria-hidden="true" className="experiences-search-icon shrink-0" size={18} />
              <div className="grid min-w-0 flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/60" htmlFor="filter-date">
                  When
                </label>
                <input
                  aria-label="When"
                  className="experiences-search-input w-full border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none focus-visible:ring-0"
                  id="filter-date"
                  type="date"
                />
              </div>
            </div>

            {/* Guests */}
            <div className="experiences-search-field flex min-h-12 items-center gap-3 border-t border-white/10 px-4 lg:border-l lg:border-t-0">
              <UsersRound aria-hidden="true" className="experiences-search-icon shrink-0" size={18} />
              <div className="grid min-w-0 flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/60" htmlFor="filter-guests">
                  Guests
                </label>
                <select
                  aria-label="Guests"
                  className="experiences-search-input w-full appearance-none border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none focus-visible:ring-0"
                  defaultValue="2"
                  id="filter-guests"
                >
                  <option className="bg-[#0d1117] text-white" value="1">1 Guest</option>
                  <option className="bg-[#0d1117] text-white" value="2">2 Guests</option>
                  <option className="bg-[#0d1117] text-white" value="4">3–5 Guests</option>
                  <option className="bg-[#0d1117] text-white" value="6">6+ Guests</option>
                </select>
              </div>
            </div>

            {/* Budget */}
            <div className="experiences-search-field flex min-h-12 items-center gap-3 border-t border-white/10 px-4 lg:border-l lg:border-t-0">
              <Sparkles aria-hidden="true" className="experiences-search-icon shrink-0" size={18} />
              <div className="grid min-w-0 flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/60" htmlFor="filter-budget">
                  Max Budget
                </label>
                <select
                  aria-label="Max Budget"
                  className="experiences-search-input w-full appearance-none border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none focus-visible:ring-0"
                  id="filter-budget"
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  value={priceRange}
                >
                  <option className="bg-[#0d1117] text-white" value="1000">Up to R 1,000</option>
                  <option className="bg-[#0d1117] text-white" value="1500">Up to R 1,500</option>
                  <option className="bg-[#0d1117] text-white" value="2000">Up to R 2,000</option>
                  <option className="bg-[#0d1117] text-white" value="3000">Up to R 3,000+</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <Button
              aria-label="Apply search"
              className="experiences-search-submit flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-7 text-sm font-semibold text-[#17130b] shadow-lg shadow-accent/20 hover:bg-accent/90 lg:rounded-full"
            >
              <Search aria-hidden="true" size={17} />
              <span>Explore</span>
            </Button>
          </div>
        </Container>
      </section>

      <section aria-label="Explore experiences by province" className="border-b border-border/70 bg-background/90 py-4">
        <Container>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">Explore by province</h2>
            <p className="text-xs text-muted-foreground">Choose a region to see its current listings</p>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <button
              aria-pressed={!selectedProvince}
              className={cn(
                "min-h-10 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !selectedProvince
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
              onClick={() => setSelectedProvince("")}
              type="button"
            >
              All provinces
            </button>
            {provinces.map((province) => {
              const count = experiences.filter((experience) => experience.provinces.includes(province)).length;
              const isSelected = selectedProvince === province;
              return (
                <button
                  aria-label={`${province}: ${count} currently listed ${count === 1 ? "experience" : "experiences"}`}
                  aria-pressed={isSelected}
                  className={cn(
                    "min-h-10 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                  key={province}
                  onClick={() => setSelectedProvince(province)}
                  type="button"
                >
                  {province}
                  <span className={cn("ml-1.5 text-[10px]", isSelected ? "text-primary-foreground/75" : "text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Popular Categories Ribbon */}
      <div className="experiences-categories sticky top-20 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <Container className="flex items-center justify-between gap-4 py-3.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              aria-pressed={selectedCategory === "All"}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                selectedCategory === "All"
                  ? "bg-primary text-white shadow-sm"
                  : "border border-border/70 bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
              onClick={() => setSelectedCategory("All")}
              type="button"
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                aria-pressed={selectedCategory === cat.name}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                  selectedCategory === cat.name
                    ? "bg-primary text-white shadow-sm"
                    : "border border-border/70 bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                type="button"
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Toggle Map & Mobile Filter trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              className="hidden sm:inline-flex"
              onClick={() => setShowMap(!showMap)}
              size="sm"
              variant={showMap ? "primary" : "outline"}
            >
              <MapIcon aria-hidden="true" size={14} />
              <span>{showMap ? "Hide Map" : "Show Map"}</span>
            </Button>

            <Button
              className="lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
              size="sm"
              variant="outline"
            >
              <SlidersHorizontal aria-hidden="true" size={14} />
              <span>Filters</span>
            </Button>
          </div>
        </Container>
      </div>

      {/* Main Listing & Filters Section */}
      <Section className="py-8 sm:py-12">
        <Container>
          {/* Controls Bar */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Showing {sortedExperiences.length} of {experiences.length} South African experiences
              </p>
              <p className="text-xs text-muted-foreground">Handpicked local small-group tours</p>
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <ArrowUpDown aria-hidden="true" size={13} /> Sort by:
              </span>
              <select
                aria-label="Sort experiences"
                className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                onChange={(e) => setSelectedSort(e.target.value)}
                value={selectedSort}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
            {/* Desktop Luxury Sticky Sidebar Filters */}
            <aside className="hidden lg:block">
              <GlassPanel className="experiences-filter-panel sticky top-40 space-y-7 rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                    <Filter aria-hidden="true" size={17} className="text-primary" /> Filters
                  </h3>
                  <button
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setSelectedCategory("All");
                      setSelectedDestination("");
                      setSelectedProvince("");
                      setPriceRange(3000);
                      setCurrentPage(1);
                      setFamilyFriendly(false);
                      setPrivateTour(false);
                    }}
                    type="button"
                  >
                    <RotateCcw aria-hidden="true" size={12} /> Reset
                  </button>
                </div>

                {/* Destination Filter */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor={filterDestinationId}>
                    Destination
                  </label>
                  <select
                    className="ui-select text-xs"
                    id={filterDestinationId}
                    onChange={(e) => setSelectedDestination(e.target.value)}
                    value={selectedDestination}
                  >
                    <option value="">All Destinations</option>
                    {destinations.map((d) => (
                      <option key={d.slug} value={d.name}>
                        {d.name} ({d.province})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="filter-province">
                    Province
                  </label>
                  <select
                    className="ui-select text-xs"
                    id="filter-province"
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    value={selectedProvince}
                  >
                    <option value="">All Provinces</option>
                    {provinces.map((province) => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>

                {/* Price Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground">Max Price</span>
                    <span className="font-semibold text-primary">R {priceRange}</span>
                  </div>
                  <input
                    aria-label="Price range filter"
                    className="w-full accent-primary"
                    max="3000"
                    min="500"
                    onChange={(e) => setPriceRange(Number(e.target.value))}
                    step="100"
                    type="range"
                    value={priceRange}
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                    <span>R 500</span>
                    <span>R 3,000+</span>
                  </div>
                </div>

                {/* Duration Filter */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor={filterDurationId}>
                    Duration
                  </label>
                  <select className="ui-select text-xs" defaultValue="any" id={filterDurationId}>
                    <option value="any">Any Duration</option>
                    <option value="short">Under 3 hours</option>
                    <option value="half">Half day (3–5 hours)</option>
                    <option value="full">Full day (6+ hours)</option>
                  </select>
                </div>

                {/* Tour Features Checkboxes */}
                <div className="space-y-3 border-t border-border/60 pt-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Experience Type
                  </span>
                  <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                    <input
                      checked={familyFriendly}
                      className="size-4 rounded border-border text-primary focus:ring-ring"
                      onChange={(e) => setFamilyFriendly(e.target.checked)}
                      type="checkbox"
                    />
                    <span>Family friendly</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                    <input
                      checked={privateTour}
                      className="size-4 rounded border-border text-primary focus:ring-ring"
                      onChange={(e) => setPrivateTour(e.target.checked)}
                      type="checkbox"
                    />
                    <span>Private tour available</span>
                  </label>
                </div>

                {/* Languages Filter */}
                <div className="border-t border-border/60 pt-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2.5">
                    Guide Languages
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {languageOptions.map((lang) => (
                      <span
                        className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground"
                        key={lang}
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="border-t border-border/60 pt-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2.5">
                    Minimum Rating
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[5, 4.8, 4.5].map((stars) => (
                      <button
                        className="flex items-center gap-1 rounded-xl border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary"
                        key={stars}
                        type="button"
                      >
                        <Star className="size-3 fill-accent text-accent" /> {stars}+
                      </button>
                    ))}
                  </div>
                </div>
              </GlassPanel>
            </aside>

            {/* Experience Grid & Split Map */}
            <div>
              {/* Optional Map Placeholder Preview */}
              {showMap ? (
                <div className="relative mb-8 h-80 w-full overflow-hidden rounded-3xl border border-border bg-[#e5ece4] p-6 text-center dark:bg-[#1a2720]">
                  <div
                    aria-hidden="true"
                    className="experience-map-grid absolute inset-0 opacity-40"
                  />
                  <div className="relative flex h-full flex-col items-center justify-center">
                    <span className="grid size-12 place-items-center rounded-full bg-primary text-white shadow-lg">
                      <MapPin size={24} />
                    </span>
                    <h3 className="mt-3 font-display text-xl font-semibold">Interactive Map View</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Displaying {filteredExperiences.length} guided tour meeting points across South Africa
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Grid */}
              {sortedExperiences.length > 0 ? (
                <div className="experiences-grid grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedExperiences.map((exp) => (
                    <ExperienceCard
                      href={`/experiences/${exp.slug}`}
                      key={exp.slug}
                      {...exp}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-border/80 bg-card p-12 text-center">
                  <Compass aria-hidden="true" className="mx-auto text-primary" size={36} />
                  <h3 className="mt-4 font-display text-2xl font-semibold">
                    {selectedProvince
                      ? `No experiences listed in ${selectedProvince} just yet`
                      : "No experiences match those filters"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    {selectedProvince
                      ? "Explore another province or clear the province filter to see the experiences currently listed."
                      : "Try expanding your budget range, resetting destination filters, or selecting All Categories."}
                  </p>
                  <Button
                    className="mt-6"
                    onClick={() => {
                      setSelectedCategory("All");
                      setSelectedDestination("");
                      setSelectedProvince("");
                      setPriceRange(3000);
                    }}
                  >
                    Reset all filters
                  </Button>
                </div>
              )}

              {/* Pagination UI */}
              <div className="mt-12 flex items-center justify-center gap-2 border-t border-border/60 pt-8">
                <Button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                {[1, 2, 3].map((page) => (
                  <Button
                    className={cn(currentPage === page && "bg-primary text-white font-semibold")}
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    size="sm"
                    variant={currentPage === page ? "primary" : "ghost"}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  onClick={() => setCurrentPage(2)}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Recently Viewed Carousel Section */}
      <Section className="border-t border-border/60 bg-secondary/30" spacing="default">
        <Container>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Your Travel Path</p>
              <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Recently Viewed</h2>
            </div>
            <Link className="text-xs font-semibold text-primary hover:underline" href="/destinations">
              Explore more destinations →
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {experiences.slice(0, 4).map((exp) => (
              <ExperienceCard
                href={`/experiences/${exp.slug}`}
                key={`recent-${exp.slug}`}
                {...exp}
              />
            ))}
          </div>
        </Container>
      </Section>

      {/* Mobile Slide-Over Filter Drawer */}
      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm lg:hidden">
          <div className="ml-auto flex h-full w-full max-w-xs flex-col bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-display text-xl font-bold">Filters</h3>
              <button
                aria-label="Close filters"
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                onClick={() => setMobileFiltersOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-muted-foreground" htmlFor="mobile-filter-destination">Destination</label>
                <input
                  className="ui-input text-xs"
                  id="mobile-filter-destination"
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  placeholder="Where?"
                  type="text"
                  value={selectedDestination}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-muted-foreground" htmlFor="mobile-filter-province">Province</label>
                <select
                  className="ui-select text-xs"
                  id="mobile-filter-province"
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  value={selectedProvince}
                >
                  <option value="">All Provinces</option>
                  {provinces.map((province) => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-xs font-bold uppercase text-muted-foreground block mb-2">Max Budget: R {priceRange}</span>
                <input
                  className="w-full accent-primary"
                  max="3000"
                  min="500"
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  type="range"
                  value={priceRange}
                />
              </div>

              <div className="space-y-3 pt-3 border-t border-border">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    checked={familyFriendly}
                    onChange={(e) => setFamilyFriendly(e.target.checked)}
                    type="checkbox"
                  />
                  <span>Family friendly</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button
                className="w-full"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Show Results
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
