"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock3, Heart, MapPin, Star } from "lucide-react";
import { formatCurrency } from "@/src/lib/format";
import { imageAlt } from "@/src/lib/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";

export function ExperienceCard({
  title,
  destination,
  image,
  imageDescription,
  href,
  duration,
  price,
  rating,
  reviewCount,
  category,
  provinces,
  guide,
}: {
  title: string;
  destination: string;
  image: string;
  imageDescription?: string;
  href?: string | null;
  duration: string;
  price: number;
  rating?: number;
  reviewCount?: number;
  category?: string;
  provinces?: string[];
  guide?: {
    name: string;
    image?: string;
  };
}) {
  const cardContent = (
    <>
      {/* Photography & Overlays */}
      <div className="experience-card-image-wrap relative isolate aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          alt={imageAlt(imageDescription)}
          className="experience-card-image object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          src={image}
          unoptimized
        />
        <div aria-hidden="true" className="experience-card-image-shade absolute inset-0 z-20 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-55 motion-reduce:transition-none" />

        {/* Category Pill */}
        {category ? (
          <span className="experience-card-category absolute left-4 top-4 z-30 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider shadow-sm backdrop-blur-md">
            {category}
          </span>
        ) : null}

        {/* Wishlist Button */}
        <button
          aria-label="Save to wishlist"
          className="experience-card-wishlist absolute right-4 top-4 z-30 grid size-10 place-items-center rounded-full shadow-md backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          type="button"
        >
          <Heart aria-hidden="true" size={16} />
        </button>

        {/* Destination Pill on image bottom */}
        <div className="experience-card-destination absolute bottom-3 left-3 z-30 flex max-w-[calc(100%-1.5rem)] items-start gap-2 rounded-2xl px-3 py-2 text-xs font-medium text-white backdrop-blur-md sm:bottom-4 sm:left-4">
          <MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={13} />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{destination}</span>
            {provinces?.length ? <span className="mt-0.5 block truncate text-[10px] text-white/80">{provinces.join(" · ")}</span> : null}
          </span>
        </div>
      </div>

      {/* Card Details */}
      <div className="experience-card-details flex flex-1 flex-col justify-between p-5">
        <div>
          {/* Guide Avatar & Rating row */}
          <div className="flex items-center justify-between gap-3 text-xs">
            {guide ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Avatar className="size-6 border border-border">
                  {guide.image ? <AvatarImage alt={guide.name} src={guide.image} /> : null}
                  <AvatarFallback className="text-[10px]">
                    {guide.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate font-medium text-foreground">{guide.name}</span>
              </div>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock3 aria-hidden="true" size={13} /> {duration}
              </span>
            )}

            {rating !== undefined && (reviewCount ?? 0) > 0 ? (
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Star aria-hidden="true" className="fill-accent text-accent" size={13} />
                {rating.toFixed(1)}
                <span className="font-normal text-muted-foreground">({reviewCount})</span>
              </span>
            ) : (
              <span className="text-muted-foreground">No guest rating yet</span>
            )}
          </div>

          {/* Title */}
          <h3 className="experience-card-title mt-3 line-clamp-2 font-display text-lg font-semibold leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
            {title}
          </h3>
        </div>

        {/* Footer: Duration & Price */}
        <div className="experience-card-footer mt-5 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock3 aria-hidden="true" size={13} /> {duration}
          </span>
          <p className="text-sm tracking-tight text-foreground">
            <span className="font-semibold text-base">{formatCurrency(price)}</span>
            <span className="text-xs text-muted-foreground"> / guest</span>
          </p>
        </div>
      </div>
    </>
  );

  return (
    <article className="experience-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] motion-reduce:transform-none motion-reduce:transition-none">
      {href ? (
        <Link className="flex h-full flex-col text-inherit no-underline" href={href}>
          {cardContent}
        </Link>
      ) : (
        <div className="flex h-full flex-col">{cardContent}</div>
      )}
    </article>
  );
}
