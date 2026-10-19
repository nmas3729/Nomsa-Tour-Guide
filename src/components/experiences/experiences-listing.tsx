"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  CalendarDays,
  Compass,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ExperienceCard } from "@/src/components/cards/experience-card";
import { Container } from "@/src/components/layout/container";
import { Section } from "@/src/components/layout/section";
import { GlassPanel } from "@/src/components/ui/glass-panel";
import { categories, destinations, provinces } from "@/src/data/public-site";
import { cn } from "@/src/lib/utils";
import type { ApprovedExperienceSummary } from "@/src/server/services/public-verification-service";

const sortOptions = [
  { label: "Default order", value: "default" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

type ExperiencesListingProps = {
  approvedExperiences: ApprovedExperienceSummary[];
  availabilityDate: string;
  availabilityGuestCount: number;
  availabilitySearchError?: string;
  availableExperienceSlugs?: string[];
  groupSizeFilter: number | null;
  minimumDate: string;
};

export function ExperiencesListing({
  approvedExperiences,
  availabilityDate,
  availabilityGuestCount,
  availabilitySearchError,
  availableExperienceSlugs,
  groupSizeFilter,
  minimumDate,
}: ExperiencesListingProps) {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedCategory, setSelectedCategoryState] = useState<string>(searchParams.get("category") ?? "All");
  const [selectedLanguage, setSelectedLanguageState] = useState<string>(searchParams.get("language") ?? "");
  const [durationFilter, setDurationFilterState] = useState<string>(searchParams.get("duration") ?? "any");
  const setSelectedCategory = (category: string) => {
    setSelectedCategoryState(category);
    setCurrentPage(1);
  };
  const setSelectedLanguage = (language: string) => {
    setSelectedLanguageState(language);
    setCurrentPage(1);
  };
  const setDurationFilter = (duration: string) => {
    setDurationFilterState(duration);
    setCurrentPage(1);
  };
  const requestedDestination = searchParams.get("destination") ?? "";
  const [destinationSelection, setDestinationSelection] = useState<{ query: string; value: string } | null>(null);
  const selectedDestination =
    destinationSelection?.query === queryString ? destinationSelection.value : requestedDestination;
  const setSelectedDestination = (destination: string) => {
    setDestinationSelection({ query: queryString, value: destination });
    setCurrentPage(1);
  };
  const [provinceSelection, setProvinceSelection] = useState<{ query: string; province: string } | null>(null);
  const requestedProvince = searchParams.get("province");
  const urlProvince = provinces.find((province) => province === requestedProvince) ?? "";
  const selectedProvince = provinceSelection?.query === queryString ? provinceSelection.province : urlProvince;
  const setSelectedProvince = (province: string) => {
    setProvinceSelection({ query: queryString, province });
    setCurrentPage(1);
  };
  const [selectedSort, setSelectedSort] = useState<string>("default");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const maximumPrice = Math.max(
    3000,
    Math.ceil(Math.max(0, ...approvedExperiences.map(({ price }) => price)) / 1000) * 1000,
  );
  const requestedPrice = Number(searchParams.get("maxPrice"));
  const [priceRange, setPriceRangeState] = useState<number>(
    Number.isFinite(requestedPrice) && requestedPrice > 0 ? Math.min(requestedPrice, maximumPrice) : maximumPrice,
  );
  const setPriceRange = (price: number) => {
    setPriceRangeState(price);
    setCurrentPage(1);
  };
  const filterDestinationId = useId();
  const filterDurationId = useId();
  const filterLanguageId = useId();
  const categoryNames = Array.from(new Set([
    ...categories.map(({ name }) => name),
    ...approvedExperiences.map(({ category }) => category),
  ]));
  const languageOptions = Array.from(new Set(approvedExperiences.flatMap(({ languages }) => languages))).sort();
  const destinationOptions = [
    ...destinations,
    ...approvedExperiences
      .filter((experience) => !destinations.some(({ name }) => name === experience.destination))
      .map((experience) => ({
        name: experience.destination,
        province: experience.provinces.join(", "),
        slug: experience.slug,
      })),
  ];
  // Filter experiences based on state
  const filteredExperiences = approvedExperiences.filter((item) => {
    if (availableExperienceSlugs && !availableExperienceSlugs.includes(item.slug)) {
      return false;
    }
    if (selectedCategory !== "All" && item.category !== selectedCategory) {
      return false;
    }
    if (selectedDestination && !item.destination.toLowerCase().includes(selectedDestination.toLowerCase())) {
      return false;
    }
    if (selectedProvince && !item.provinces.includes(selectedProvince)) {
      return false;
    }
    if (groupSizeFilter !== null && (item.minGuests > groupSizeFilter || item.maxGuests < groupSizeFilter)) {
      return false;
    }
    if (selectedLanguage && !item.languages.includes(selectedLanguage)) {
      return false;
    }
    if (
      durationFilter === "short" && item.durationMinutes >= 180 ||
      durationFilter === "half" && (item.durationMinutes < 180 || item.durationMinutes >= 360) ||
      durationFilter === "full" && item.durationMinutes < 360
    ) {
      return false;
    }
    if (item.price > priceRange) {
      return false;
    }
    return true;
  });
  const sortedExperiences = [...filteredExperiences].sort((first, second) => {
    switch (selectedSort) {
      case "price_asc":
        return first.price - second.price;
      case "price_desc":
        return second.price - first.price;
      default:
        return 0;
    }
  });
  const pageSize = 9;
  const pageCount = Math.max(1, Math.ceil(sortedExperiences.length / pageSize));
  const pagedExperiences = sortedExperiences.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const searchCriteria = new URLSearchParams();
  if (selectedDestination) searchCriteria.set("destination", selectedDestination);
  const province = selectedProvince;
  if (province) searchCriteria.set("province", province);
  if (availabilityDate) searchCriteria.set("date", availabilityDate);
  if (searchParams.has("guests")) searchCriteria.set("guests", String(availabilityGuestCount));
  if (selectedLanguage) searchCriteria.set("language", selectedLanguage);
  if (selectedCategory !== "All") searchCriteria.set("category", selectedCategory);
  if (priceRange < maximumPrice) searchCriteria.set("maxPrice", String(priceRange));
  if (durationFilter !== "any") searchCriteria.set("duration", durationFilter);
  const searchCriteriaString = searchCriteria.toString();

  return (
    <div className="experiences-page bg-background text-foreground">
      {/* Editorial Page Header */}
      <section className="experiences-hero relative isolate overflow-hidden border-b border-border/70 py-16 text-white sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="experiences-heading mt-4 font-display text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
              Find an experience
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
              Walks, safaris, tastings, and cultural tours led by local guides.
            </p>
          </div>

          {/* Floating Search Bar */}
          <form
            action="/experiences"
            aria-label="Search and filter experiences"
            className="experiences-search mx-auto mt-12 grid max-w-5xl gap-2.5 rounded-3xl border p-3 text-white shadow-2xl backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-center lg:rounded-full lg:p-2.5"
            key={queryString}
            method="get"
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
                  name="destination"
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
                  min={minimumDate}
                  name="date"
                  defaultValue={availabilityDate}
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
                  defaultValue={
                    availabilityGuestCount >= 1 && availabilityGuestCount <= 10
                      ? String(availabilityGuestCount)
                      : "2"
                  }
                  id="filter-guests"
                  name="guests"
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((guestCount) => (
                    <option className="bg-[#0d1117] text-white" key={guestCount} value={guestCount}>
                      {guestCount} {guestCount === 1 ? "Guest" : "Guests"}
                    </option>
                  ))}
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
                  name="maxPrice"
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  value={priceRange}
                >
                  <option className="bg-[#0d1117] text-white" value="1000">Up to R 1,000</option>
                  <option className="bg-[#0d1117] text-white" value="1500">Up to R 1,500</option>
                  <option className="bg-[#0d1117] text-white" value="2000">Up to R 2,000</option>
                  <option className="bg-[#0d1117] text-white" value={maximumPrice}>
                    Up to R {maximumPrice.toLocaleString("en-ZA")}+
                  </option>
                </select>
              </div>
            </div>
            <input name="category" type="hidden" value={selectedCategory} />
            <input name="language" type="hidden" value={selectedLanguage} />
            <input name="province" type="hidden" value={selectedProvince} />
            <input name="duration" type="hidden" value={durationFilter} />

            {/* Search Button */}
            <Button
              aria-label="Apply search"
              className="experiences-search-submit flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-7 text-sm font-semibold text-[#17130b] shadow-lg shadow-accent/20 hover:bg-accent/90 lg:rounded-full"
              type="submit"
            >
              <Search aria-hidden="true" size={17} />
              <span>Explore</span>
            </Button>
          </form>
          <p className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-white/80">
            Looking for something tailored?
            <Button asChild className="h-auto min-h-0 px-1 py-0 text-sm text-white underline underline-offset-4" variant="link">
              <Link href="/custom-itinerary">Request a custom itinerary</Link>
            </Button>
          </p>
        </Container>
      </section>

      <section aria-label="Explore experiences by province" className="border-b border-border/70 bg-background/90 py-4">
        <Container>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">Browse by province</h2>
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
              const count = approvedExperiences.filter((experience) => experience.provinces.includes(province)).length;
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
                    {count > 0 ? count : null}
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
            {categoryNames.map((categoryName) => (
              <button
                aria-pressed={selectedCategory === categoryName}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                  selectedCategory === categoryName
                    ? "bg-primary text-white shadow-sm"
                    : "border border-border/70 bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
                key={categoryName}
                onClick={() => setSelectedCategory(categoryName)}
                type="button"
              >
                {categoryName}
              </button>
            ))}
          </div>

          {/* Toggle Map & Mobile Filter trigger */}
          <div className="flex items-center gap-2 shrink-0">
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
          <div
            aria-live="polite"
            className={cn(
              "mb-6 rounded-2xl border px-4 py-3 text-sm",
              availabilitySearchError
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border/70 bg-card text-muted-foreground",
            )}
            role={availabilitySearchError ? "alert" : "status"}
          >
            {availabilitySearchError
              ? availabilitySearchError
              : !approvedExperiences.length
                ? "We're onboarding local guides and adding our first experiences. Check back soon for new tours across South Africa."
                : availabilityDate && availableExperienceSlugs
                ? `${filteredExperiences.length} listed ${filteredExperiences.length === 1 ? "experience currently meets" : "experiences currently meet"} capacity for ${availabilityGuestCount} ${availabilityGuestCount === 1 ? "guest" : "guests"} on ${availabilityDate}. Capacity is checked again when booking.`
                : "Choose a travel date to filter by live availability. Without a date, results show listed experiences that may not have an available departure."}
          </div>

          {/* Controls Bar */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {approvedExperiences.length > 0
                  ? `${sortedExperiences.length} of ${approvedExperiences.length} reviewed experiences`
                  : "New experiences are coming soon"}
              </p>
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
                      setPriceRange(maximumPrice);
                      setSelectedLanguage("");
                      setDurationFilter("any");
                      setCurrentPage(1);
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
                    {destinationOptions.map((destination) => (
                      <option key={destination.slug} value={destination.name}>
                        {destination.name} ({destination.province})
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
                    <span className="font-semibold text-primary">R {priceRange.toLocaleString("en-ZA")}</span>
                  </div>
                  <input
                    aria-label="Price range filter"
                    className="w-full accent-primary"
                    max={maximumPrice}
                    min="500"
                    onChange={(e) => setPriceRange(Number(e.target.value))}
                    step="100"
                    type="range"
                    value={priceRange}
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                    <span>R 500</span>
                    <span>R {maximumPrice.toLocaleString("en-ZA")}+</span>
                  </div>
                </div>

                {/* Duration Filter */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor={filterDurationId}>
                    Duration
                  </label>
                  <select
                    className="ui-select text-xs"
                    id={filterDurationId}
                    onChange={(event) => setDurationFilter(event.target.value)}
                    value={durationFilter}
                  >
                    <option value="any">Any Duration</option>
                    <option value="short">Under 3 hours</option>
                    <option value="half">3 to under 6 hours</option>
                    <option value="full">Full day (6+ hours)</option>
                  </select>
                </div>

                <div className="border-t border-border/60 pt-5">
                  <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor={filterLanguageId}>
                    Guide language
                  </label>
                  <select
                    className="ui-select text-xs"
                    id={filterLanguageId}
                    onChange={(event) => setSelectedLanguage(event.target.value)}
                    value={selectedLanguage}
                  >
                    <option value="">Any language</option>
                    {languageOptions.map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                </div>

              </GlassPanel>
            </aside>

            {/* Experience Grid & Split Map */}
            <div>
              {/* Grid */}
              {pagedExperiences.length > 0 ? (
                <div className="experiences-grid grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {pagedExperiences.map((exp) => (
                    <ExperienceCard
                      href={`/experiences/${exp.slug}${searchCriteriaString ? `?${searchCriteriaString}` : ""}`}
                      key={exp.slug}
                      {...exp}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-border/80 bg-card p-12 text-center">
                  <Compass aria-hidden="true" className="mx-auto text-primary" size={36} />
                  <h3 className="mt-4 font-display text-2xl font-semibold">
                    {!approvedExperiences.length
                      ? "New experiences are coming soon"
                      : availabilityDate && availableExperienceSlugs
                      ? "No experiences match your date, group size, and filters"
                      : selectedProvince
                      ? `No experiences listed in ${selectedProvince} just yet`
                      : "No experiences match those filters"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    {!approvedExperiences.length
                      ? "We're onboarding local guides and adding our first experiences. Check back soon for new tours across South Africa."
                      : availabilityDate && availableExperienceSlugs
                      ? "Try another date, a smaller group, or broader filters. Capacity is confirmed again during booking."
                      : selectedProvince
                      ? "Explore another province or clear the province filter to see the experiences currently listed."
                      : "Try expanding your budget range, resetting destination filters, or selecting All Categories."}
                  </p>
                  {!approvedExperiences.length ? (
                    <Button asChild className="mt-6">
                      <Link href="/become-a-guide">Become a guide</Link>
                    </Button>
                  ) : (
                    <Button
                      className="mt-6"
                      onClick={() => {
                        setSelectedCategory("All");
                        setSelectedDestination("");
                        setSelectedProvince("");
                        setPriceRange(maximumPrice);
                        setSelectedLanguage("");
                        setDurationFilter("any");
                        setCurrentPage(1);
                      }}
                    >
                      Reset all filters
                    </Button>
                  )}
                </div>
              )}

              {pageCount > 1 ? (
                <nav aria-label="Experience pages" className="mt-12 flex items-center justify-center gap-2 border-t border-border/60 pt-8">
                  <Button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                    <Button
                      aria-current={currentPage === page ? "page" : undefined}
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
                    disabled={currentPage >= pageCount}
                    onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </nav>
              ) : null}
            </div>
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
                <span className="text-xs font-bold uppercase text-muted-foreground block mb-2">Max Budget: R {priceRange.toLocaleString("en-ZA")}</span>
                <input
                  className="w-full accent-primary"
                  max={maximumPrice}
                  min="500"
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  type="range"
                  value={priceRange}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-muted-foreground" htmlFor="mobile-filter-language">
                  Guide language
                </label>
                <select
                  className="ui-select text-xs"
                  id="mobile-filter-language"
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  value={selectedLanguage}
                >
                  <option value="">Any language</option>
                  {languageOptions.map((language) => <option key={language} value={language}>{language}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-muted-foreground" htmlFor="mobile-filter-duration">
                  Duration
                </label>
                <select
                  className="ui-select text-xs"
                  id="mobile-filter-duration"
                  onChange={(event) => setDurationFilter(event.target.value)}
                  value={durationFilter}
                >
                  <option value="any">Any duration</option>
                  <option value="short">Under 3 hours</option>
                  <option value="half">3 to under 6 hours</option>
                  <option value="full">6+ hours</option>
                </select>
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
