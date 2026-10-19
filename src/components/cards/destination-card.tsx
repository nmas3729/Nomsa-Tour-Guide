import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { imageAlt } from "@/src/lib/image";

export function DestinationCard({
  name,
  province,
  image,
  imageDescription,
  experiencesCount,
  description,
  href,
}: {
  name: string;
  province: string;
  image: string;
  imageDescription?: string;
  experiencesCount?: number;
  description?: string;
  href?: string | null;
}) {
  const containerClass =
    "group relative isolate flex min-h-[320px] w-full flex-col justify-end overflow-hidden rounded-3xl bg-muted text-white no-underline shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)]";

  const content = (
    <>
      <Image
        alt={imageAlt(imageDescription, `${name}, ${province}`)}
        className="-z-10 object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        src={image}
      />
      {/* Cinematic Dual Gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-500 group-hover:from-black/90"
      />

      <div className="relative z-30 flex flex-col p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#f4cd9f]">
            <MapPin aria-hidden="true" size={12} />
            {province}
          </span>
          {experiencesCount !== undefined ? (
            <span className="max-w-40 rounded-full bg-white/20 px-2.5 py-0.5 text-right text-[10px] font-medium leading-tight tracking-wide text-white backdrop-blur-md sm:text-[11px]">
              {experiencesCount > 0
                ? `${experiencesCount} ${experiencesCount === 1 ? "experience" : "experiences"}`
                : "New experiences coming soon"}
            </span>
          ) : null}
        </div>

        <h3 className="mt-2.5 font-display text-2xl font-semibold tracking-tight text-white transition-colors duration-200 sm:text-3xl">
          {name}
        </h3>

        {description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/80 sm:text-sm">
            {description}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
          <span>View experiences</span>
          <ArrowRight aria-hidden="true" size={14} />
        </div>
      </div>
    </>
  );

  return href ? (
    <Link className={containerClass} href={href}>
      {content}
    </Link>
  ) : (
    <article className={containerClass}>{content}</article>
  );
}
