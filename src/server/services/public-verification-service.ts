import "server-only";

import {
  ExperienceStatus,
  GuideApplicationStatus,
  ReviewStatus,
} from "@/src/server/db/generated/enums";
import { detailedExperiences, type ExperienceDetailData } from "@/src/data/experience-details";
import { destinations, experiences } from "@/src/data/public-site";
import { getServerEnvironment } from "@/src/config/env";
import { getPrismaClient } from "@/src/server/db/prisma";

const approvedExperienceWhere = {
  status: ExperienceStatus.PUBLISHED,
  verificationStatus: GuideApplicationStatus.APPROVED,
  deletedAt: null,
  guide: {
    is: {
      verificationStatus: GuideApplicationStatus.APPROVED,
      deletedAt: null,
      user: { is: { isActive: true, deletedAt: null } },
    },
  },
} as const;

export type ApprovedExperienceSummary = {
  title: string;
  slug: string;
  destination: string;
  provinces: string[];
  image?: string;
  imageDescription?: string;
  duration: string;
  durationMinutes: number;
  price: number;
  category: string;
  minGuests: number;
  maxGuests: number;
  languages: string[];
  guide: { name: string; image?: string };
};

function cloudinaryImageUrl(publicId: string): string | undefined {
  const cloudName = getServerEnvironment().CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return undefined;
  const encodedId = publicId.split("/").map(encodeURIComponent).join("/");
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_1600/${encodedId}`;
}

const localExperienceImages = [
  ...destinations.map(({ image, imageDescription }) => ({
    url: image,
    altText: imageDescription,
  })),
  ...experiences.map(({ image, imageDescription }) => ({
    url: image,
    altText: imageDescription,
  })),
  ...Object.values(detailedExperiences).flatMap(({ images }) =>
    images.map(({ url, caption }) => ({ url, altText: caption })),
  ),
];
const localExperienceImagesByName = new Map(
  localExperienceImages.map((image) => [
    image.url.split("/").at(-1)?.replace(/\.[^.]+$/, "") ?? "",
    image,
  ]),
);

function experienceImage(storageKey: string, altText: string) {
  const localImage = localExperienceImagesByName.get(storageKey.split("/").at(-1) ?? "");
  if (localImage) return { ...localImage, altText: altText || localImage.altText };

  const url = cloudinaryImageUrl(storageKey);
  return url ? { url, altText } : undefined;
}

function experienceDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return `${hours} hr ${remainder} min`;
  if (hours) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${minutes} min`;
}

export async function getApprovedExperiences(): Promise<ApprovedExperienceSummary[]> {
  const rows = await getPrismaClient().experience.findMany({
    where: approvedExperienceWhere,
    select: {
      title: true,
      slug: true,
      price: true,
      durationMinutes: true,
      minGuests: true,
      maxGuests: true,
      category: { select: { name: true } },
      destination: {
        select: { name: true, city: { select: { province: { select: { name: true } } } } },
      },
      images: {
        select: { storageKey: true, altText: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
      guide: {
        select: {
          profilePhoto: true,
          languages: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { title: "asc" },
  });
  return rows.map((row) => {
    const image = row.images[0]
      ? experienceImage(row.images[0].storageKey, row.images[0].altText)
      : undefined;
    return {
      title: row.title,
      slug: row.slug,
      destination: row.destination.name,
      provinces: [row.destination.city.province.name],
      image: image?.url,
      imageDescription: image?.altText,
      duration: experienceDuration(row.durationMinutes),
      durationMinutes: row.durationMinutes,
      price: Number(row.price),
      category: row.category.name,
      minGuests: row.minGuests,
      maxGuests: row.maxGuests,
      languages: row.guide.languages,
      guide: {
        name: row.guide.user.name,
        image: row.guide.profilePhoto ?? undefined,
      },
    };
  });
}

export async function getApprovedExperienceDetail(
  slug: string,
): Promise<ExperienceDetailData | null> {
  const row = await getPrismaClient().experience.findFirst({
    where: { ...approvedExperienceWhere, slug },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      durationMinutes: true,
      price: true,
      minGuests: true,
      maxGuests: true,
      meetingPoint: true,
      inclusions: true,
      exclusions: true,
      cancellationPolicy: true,
      category: { select: { name: true } },
      destination: {
        select: {
          name: true,
          city: { select: { province: { select: { name: true } } } },
        },
      },
      images: {
        select: { storageKey: true, altText: true },
        orderBy: { sortOrder: "asc" },
      },
      guide: {
        select: {
          biography: true,
          specialties: true,
          languages: true,
          yearsExperience: true,
          operatingAreas: true,
          profilePhoto: true,
          averageRating: true,
          totalReviews: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!row) return null;
  const [reviewSummary, reviews] = await Promise.all([
    getPrismaClient().review.aggregate({
      where: { experienceId: row.id, status: ReviewStatus.APPROVED, deletedAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    getPrismaClient().review.findMany({
      where: { experienceId: row.id, status: ReviewStatus.APPROVED, deletedAt: null },
      select: { id: true, rating: true, reviewText: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const location = row.guide.operatingAreas.join(" · ");
  return {
    slug: row.slug,
    title: row.title,
    destination: row.destination.name,
    province: row.destination.city.province.name,
    category: row.category.name,
    price: Number(row.price),
    rating: Number(reviewSummary._avg.rating ?? 0),
    reviewCount: reviewSummary._count._all,
    duration: experienceDuration(row.durationMinutes),
    groupSize: row.minGuests === row.maxGuests
      ? `${row.maxGuests} ${row.maxGuests === 1 ? "guest" : "guests"}`
      : `${row.minGuests}–${row.maxGuests} guests`,
    languages: row.guide.languages,
    images: row.images.flatMap((image) => {
      const resolved = experienceImage(image.storageKey, image.altText);
      return resolved ? [{ url: resolved.url, caption: resolved.altText }] : [];
    }),
    overview: row.description,
    highlights: [],
    included: row.inclusions,
    excluded: row.exclusions,
    itinerary: [],
    meetingPoint: row.meetingPoint
      ? { name: row.meetingPoint, address: "", notes: "", coordinates: "" }
      : undefined,
    cancellationPolicy: row.cancellationPolicy,
    guideProfile: {
      name: row.guide.user.name,
      location,
      biography: row.guide.biography ?? "",
      image: row.guide.profilePhoto ?? undefined,
      rating: Number(row.guide.averageRating),
      yearsExperience: row.guide.yearsExperience,
      specialties: row.guide.specialties,
      languages: row.guide.languages,
    },
    faqs: [],
    reviews: reviews.map((review) => ({
      id: review.id,
      name: "Traveller",
      rating: review.rating,
      date: review.createdAt.toISOString().slice(0, 10),
      comment: review.reviewText,
    })),
  };
}

export async function getApprovedExperienceSlugs(): Promise<string[]> {
  const rows = await getPrismaClient().experience.findMany({
    where: approvedExperienceWhere,
    select: { slug: true },
    orderBy: { title: "asc" },
  });
  return rows.map(({ slug }) => slug);
}

export async function getApprovedGuideProfiles() {
  const rows = await getPrismaClient().guideProfile.findMany({
    where: {
      verificationStatus: GuideApplicationStatus.APPROVED,
      deletedAt: null,
      user: { is: { isActive: true, deletedAt: null } },
    },
    select: {
      biography: true,
      specialties: true,
      languages: true,
      yearsExperience: true,
      operatingAreas: true,
      profilePhoto: true,
      averageRating: true,
      totalReviews: true,
      experiences: {
        where: {
          status: ExperienceStatus.PUBLISHED,
          verificationStatus: GuideApplicationStatus.APPROVED,
          deletedAt: null,
        },
        select: {
          title: true,
          slug: true,
          destination: { select: { name: true } },
        },
        orderBy: { title: "asc" },
      },
      user: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return rows.map((guide) => ({
    name: guide.user.name,
    location: guide.operatingAreas.join(" · "),
    biography: guide.biography ?? "",
    image: guide.profilePhoto ?? undefined,
    rating: Number(guide.averageRating),
    yearsExperience: guide.yearsExperience,
    specialties: guide.specialties,
    languages: guide.languages,
    experiences: guide.experiences.map((experience) => ({
      title: experience.title,
      href: `/experiences/${experience.slug}`,
      destination: experience.destination.name,
    })),
  }));
}
