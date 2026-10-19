import Link from "next/link";
import { ArrowUpRight, Globe, MapPin, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";

export function GuideCard({
  name,
  href,
  location,
  biography,
  image,
  rating,
  specialties,
  languages,
  yearsExperience,
  experiences,
}: {
  name: string;
  href?: string | null;
  location?: string;
  biography?: string;
  image?: string;
  rating?: number;
  specialties?: string[];
  languages?: string[];
  yearsExperience?: number;
  experiences?: Array<{ title: string; href: string; destination?: string }>;
}) {
  return (
    <article className="guide-profile-card group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] motion-reduce:transform-none motion-reduce:transition-none sm:p-7">
      <div>
        <div className="flex items-start gap-4">
          <div className="guide-profile-card__portrait relative shrink-0 rounded-2xl p-0.5">
            <Avatar className="size-[4.5rem] rounded-2xl shadow-md transition-transform duration-500 group-hover:scale-[1.03] sm:size-20">
              {image ? <AvatarImage alt={name} className="object-cover" src={image} /> : null}
              <AvatarFallback className="rounded-2xl text-lg font-semibold text-primary">
                {name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-xl font-semibold leading-tight tracking-tight text-foreground">
                {href ? (
                  <Link className="text-foreground no-underline transition-colors hover:text-primary" href={href}>
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </h3>
            </div>

            {location?.trim() ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={13} />
                {location}
              </p>
            ) : null}

            {(rating !== undefined && rating > 0) || (yearsExperience !== undefined && yearsExperience > 0) ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {rating !== undefined && rating > 0 ? (
                  <span aria-label={`Guide rating ${rating.toFixed(1)} out of 5`} className="flex items-center gap-1 font-semibold text-foreground">
                    <Star aria-hidden="true" className="fill-accent-strong text-accent-strong" size={13} />
                    {rating.toFixed(1)} <span className="font-normal text-muted-foreground">rating</span>
                  </span>
                ) : null}

                {yearsExperience !== undefined && yearsExperience > 0 ? (
                  <span className="font-medium text-foreground">
                    {yearsExperience} {yearsExperience === 1 ? "year" : "years"} of experience
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {biography?.trim() ? (
          <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{biography}</p>
        ) : null}

        {languages?.length ? (
          <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Globe aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-primary" />
            <span>{languages.join(" · ")}</span>
          </div>
        ) : null}

        {specialties?.length ? (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Specialties</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {specialties.map((specialty) => (
                <span
                  className="rounded-full bg-primary/8 px-3 py-1 text-xs font-medium text-primary"
                  key={specialty}
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 border-t border-border/50 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Listed experiences</p>
        {experiences?.length ? (
          <ul className="mt-2 space-y-1">
            {experiences.map((experience) => (
              <li key={experience.href}>
                <Link
                  className="group/link flex min-h-10 items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  href={experience.href}
                >
                  <span className="min-w-0">
                    <span className="block line-clamp-2">{experience.title}</span>
                    {experience.destination ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{experience.destination}</span>
                    ) : null}
                  </span>
                  <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No experiences listed yet.</p>
        )}
      </div>
    </article>
  );
}
