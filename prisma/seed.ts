import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/server/db/generated/client";
import { createJiti } from "jiti";

if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
  console.error("[seed] Refusing to seed production without SEED_ALLOW_PRODUCTION=true.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to run the seed script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const prismaClient = prisma;

const PASSWORD = "NomsaTestPass!2026";
const BANK_ACCOUNT_NUMBER = "0000012345";
const SEED_DATE = new Date();
const COMPLETED_AT = new Date(SEED_DATE.getTime() - 60 * 86_400_000);
const COMPLETED_EXPERIENCE_DATE = new Date(COMPLETED_AT.getTime() - 3 * 60 * 60 * 1000);
const AVAILABILITY_DATES = [14, 21].map((days) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
});
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ADMIN_TOTP_SECRET = toBase32(
  createHash("sha256").update("nomsa-tour-guides-seed-admin-totp").digest().subarray(0, 20),
);

const counts = new Map<string, { created: number; existing: number }>();
const appJiti = createJiti(import.meta.url, {
  tsconfigPaths: true,
  virtualModules: { "server-only": {} },
});

function toBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let encoded = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    encoded += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return encoded;
}

async function upsertTracked<T>(
  label: string,
  exists: () => Promise<unknown>,
  upsert: () => Promise<T>,
): Promise<T> {
  const alreadyExisted = Boolean(await exists());
  const result = await upsert();
  const item = counts.get(label) ?? { created: 0, existing: 0 };
  item[alreadyExisted ? "existing" : "created"] += 1;
  counts.set(label, item);
  return result;
}

function seedId(value: string): string {
  const hex = createHash("sha256").update(`nomsa-seed:${value}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function seed() {
  const [password, totpCrypto, guideDataCrypto] = await Promise.all([
    appJiti.import<typeof import("../src/features/auth/lib/password")>(
      "../src/features/auth/lib/password",
    ),
    appJiti.import<typeof import("../src/features/auth/lib/totp-crypto")>(
      "../src/features/auth/lib/totp-crypto",
    ),
    appJiti.import<typeof import("../src/server/services/guide-data-crypto")>(
      "../src/server/services/guide-data-crypto",
    ),
  ]);
  const testPasswordHash = await password.hashPassword(PASSWORD);
  const encryptedTotpSecret = totpCrypto.encryptTotpSecret(ADMIN_TOTP_SECRET);
  const encryptedBankAccount = guideDataCrypto.encryptGuideText(BANK_ACCOUNT_NUMBER);

  const country = await upsertTracked(
    "Countries",
    () => prismaClient.country.findUnique({ where: { code: "ZA" } }),
    () => prismaClient.country.upsert({
      where: { code: "ZA" },
      update: { name: "South Africa" },
      create: { code: "ZA", name: "South Africa" },
    }),
  );

  const provinceData = [
    ["eastern-cape", "Eastern Cape"],
    ["free-state", "Free State"],
    ["gauteng", "Gauteng"],
    ["kwazulu-natal", "KwaZulu-Natal"],
    ["limpopo", "Limpopo"],
    ["mpumalanga", "Mpumalanga"],
    ["north-west", "North West"],
    ["northern-cape", "Northern Cape"],
    ["western-cape", "Western Cape"],
  ] as const;
  const provinces = new Map<string, string>();
  for (const [slug, name] of provinceData) {
    const province = await upsertTracked(
      "Provinces",
      () => prismaClient.province.findUnique({
        where: { countryId_slug: { countryId: country.id, slug } },
      }),
      () => prismaClient.province.upsert({
        where: { countryId_slug: { countryId: country.id, slug } },
        update: { name },
        create: { countryId: country.id, slug, name },
      }),
    );
    provinces.set(slug, province.id);
  }

  const cityData = [
    ["gauteng", "johannesburg", "Johannesburg"],
    ["gauteng", "pretoria", "Pretoria"],
    ["western-cape", "cape-town", "Cape Town"],
    ["western-cape", "stellenbosch", "Stellenbosch"],
    ["kwazulu-natal", "durban", "Durban"],
    ["kwazulu-natal", "pietermaritzburg", "Pietermaritzburg"],
  ] as const;
  const cities = new Map<string, string>();
  for (const [provinceSlug, slug, name] of cityData) {
    const provinceId = provinces.get(provinceSlug);
    if (!provinceId) throw new Error(`Missing province ${provinceSlug}.`);
    const city = await upsertTracked(
      "Cities",
      () => prismaClient.city.findUnique({
        where: { provinceId_slug: { provinceId, slug } },
      }),
      () => prismaClient.city.upsert({
        where: { provinceId_slug: { provinceId, slug } },
        update: { name },
        create: { provinceId, slug, name },
      }),
    );
    cities.set(slug, city.id);
  }

  const destinationData = [
    ["johannesburg", "johannesburg-city-centre", "Johannesburg City Centre", -26.2041, 28.0473],
    ["pretoria", "pretoria-city", "Pretoria City", -25.7479, 28.2293],
    ["cape-town", "cape-town-city", "Cape Town", -33.9249, 18.4241],
    ["stellenbosch", "stellenbosch-winelands", "Stellenbosch Winelands", -33.9321, 18.8602],
    ["durban", "durban-city", "Durban City", -29.8587, 31.0218],
  ] as const;
  const destinations = new Map<string, string>();
  for (const [citySlug, slug, name, latitude, longitude] of destinationData) {
    const cityId = cities.get(citySlug);
    if (!cityId) throw new Error(`Missing city ${citySlug}.`);
    const destination = await upsertTracked(
      "Destinations",
      () => prismaClient.destination.findUnique({
        where: { cityId_slug: { cityId, slug } },
      }),
      () => prismaClient.destination.upsert({
        where: { cityId_slug: { cityId, slug } },
        update: { name, latitude, longitude, deletedAt: null },
        create: { cityId, slug, name, latitude, longitude },
      }),
    );
    destinations.set(slug, destination.id);
  }

  const categoryData = [
    ["walking-tours", "Walking Tours", 10],
    ["safari-tours", "Safari Tours", 20],
    ["wine-tours", "Wine Tours", 30],
    ["cultural-tours", "Cultural Tours", 40],
    ["food-tours", "Food Tours", 50],
    ["adventure-tours", "Adventure Tours", 60],
  ] as const;
  const categories = new Map<string, string>();
  for (const [slug, name, sortOrder] of categoryData) {
    const category = await upsertTracked(
      "Categories",
      () => prismaClient.category.findUnique({ where: { slug } }),
      () => prismaClient.category.upsert({
        where: { slug },
        update: { name, sortOrder, isActive: true, deletedAt: null },
        create: { slug, name, sortOrder },
      }),
    );
    categories.set(slug, category.id);
  }

  const users = [
    {
      email: "admin@nomsatourguides.co.za",
      name: "Nomsa Tour Admin",
      role: "ADMIN" as const,
      phone: "+27 10 000 0001",
    },
    {
      email: "customer@nomsatourguides.co.za",
      name: "Test Customer",
      role: "CUSTOMER" as const,
      phone: "+27 10 000 0002",
    },
    {
      email: "guide1@nomsatourguides.co.za",
      name: "Sipho Ndlovu",
      role: "GUIDE" as const,
      phone: "+27 10 000 0003",
    },
    {
      email: "guide2@nomsatourguides.co.za",
      name: "Zanele Mokoena",
      role: "GUIDE" as const,
      phone: "+27 10 000 0004",
    },
  ];
  const seededUsers = new Map<string, { id: string }>();
  for (const user of users) {
    const privilegedMfaData = user.role === "ADMIN"
      ? {
          totpSecretEncrypted: encryptedTotpSecret,
          totpEnabledAt: SEED_DATE,
          totpLastUsedStep: null,
        }
      : {};
    const result = await upsertTracked(
      "Users",
      () => prismaClient.user.findUnique({ where: { email: user.email } }),
      () => prismaClient.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          passwordHash: testPasswordHash,
          phone: user.phone,
          role: user.role,
          emailVerified: SEED_DATE,
          isActive: true,
          deletedAt: null,
          ...privilegedMfaData,
        },
        create: {
          ...user,
          passwordHash: testPasswordHash,
          emailVerified: SEED_DATE,
          ...privilegedMfaData,
        },
      }),
    );
    seededUsers.set(user.email, result);
  }

  const admin = seededUsers.get("admin@nomsatourguides.co.za");
  const customer = seededUsers.get("customer@nomsatourguides.co.za");
  if (!admin || !customer) throw new Error("Seed admin or customer user is missing.");

  await upsertTracked(
    "Admin customer profile",
    () => prismaClient.customerProfile.findUnique({ where: { userId: admin.id } }),
    () => prismaClient.customerProfile.upsert({
      where: { userId: admin.id },
      update: { preferredCurrency: "ZAR", preferredLanguages: ["English"] },
      create: { userId: admin.id, preferredCurrency: "ZAR", preferredLanguages: ["English"] },
    }),
  );

  await upsertTracked(
    "Customer profiles",
    () => prismaClient.customerProfile.findUnique({ where: { userId: customer.id } }),
    () => prismaClient.customerProfile.upsert({
      where: { userId: customer.id },
      update: { preferredCurrency: "ZAR", preferredLanguages: ["English"] },
      create: { userId: customer.id, preferredCurrency: "ZAR", preferredLanguages: ["English"] },
    }),
  );

  const guides = [
    {
      email: "guide1@nomsatourguides.co.za",
      name: "Sipho Ndlovu",
      biography: "An experienced Gauteng guide offering wildlife, city, and birding experiences.",
      yearsExperience: 12,
      specialties: ["Safari", "Walking", "Birding"],
      languages: ["English", "IsiZulu"],
      operatingAreas: ["Johannesburg", "Pretoria", "Kruger National Park"],
      emergencyContactName: "Naledi Ndlovu",
      emergencyContactPhone: "+27 82 000 0102",
      bankName: "First National Bank",
      accountHolder: "Sipho Ndlovu",
    },
    {
      email: "guide2@nomsatourguides.co.za",
      name: "Zanele Mokoena",
      biography: "A coastal and cultural guide sharing Cape Town and the Cape Winelands.",
      yearsExperience: 10,
      specialties: ["Cultural", "Food", "Coastal"],
      languages: ["English", "IsiXhosa"],
      operatingAreas: ["Cape Town", "Stellenbosch", "Durban"],
      emergencyContactName: "Bongani Mokoena",
      emergencyContactPhone: "+27 83 000 0104",
      bankName: "First National Bank",
      accountHolder: "Zanele Mokoena",
    },
  ] as const;
  const guideProfiles = new Map<string, { id: string }>();
  for (const guide of guides) {
    const user = seededUsers.get(guide.email);
    if (!user) throw new Error(`Seed guide user ${guide.email} is missing.`);
    const profile = await upsertTracked(
      "Guide profiles",
      () => prismaClient.guideProfile.findUnique({ where: { userId: user.id } }),
      () => prismaClient.guideProfile.upsert({
        where: { userId: user.id },
        update: {
          biography: guide.biography,
          specialties: [...guide.specialties],
          languages: [...guide.languages],
          yearsExperience: guide.yearsExperience,
          operatingAreas: [...guide.operatingAreas],
          verificationStatus: "APPROVED",
          profilePhoto: `https://ui-avatars.com/api/?name=${encodeURIComponent(guide.name)}&background=1e3a8a&color=fff&size=128`,
          deletedAt: null,
        },
        create: {
          userId: user.id,
          biography: guide.biography,
          specialties: [...guide.specialties],
          languages: [...guide.languages],
          yearsExperience: guide.yearsExperience,
          operatingAreas: [...guide.operatingAreas],
          verificationStatus: "APPROVED",
          profilePhoto: `https://ui-avatars.com/api/?name=${encodeURIComponent(guide.name)}&background=1e3a8a&color=fff&size=128`,
        },
      }),
    );
    guideProfiles.set(guide.email, profile);

    const applicationSlug = `seed-${guide.email.split("@")[0]}-application`;
    const guideApplication = {
      applicantId: user.id,
      reviewedById: admin.id,
      fullName: guide.name,
      phone: guide.email === "guide1@nomsatourguides.co.za" ? "+27 10 000 0003" : "+27 10 000 0004",
      email: guide.email,
      biography: guide.biography,
      yearsExperience: guide.yearsExperience,
      specialties: [...guide.specialties],
      languages: [...guide.languages],
      operatingAreas: [...guide.operatingAreas],
      emergencyContactName: guide.emergencyContactName,
      emergencyContactPhone: guide.emergencyContactPhone,
      status: "APPROVED" as const,
      submittedAt: SEED_DATE,
      approvedAt: SEED_DATE,
      proposedExperienceSlug: applicationSlug,
    };
    await upsertTracked(
      "Guide applications",
      () => prismaClient.guideApplication.findUnique({
        where: { proposedExperienceSlug: applicationSlug },
      }),
      () => prismaClient.guideApplication.upsert({
        where: { proposedExperienceSlug: applicationSlug },
        update: guideApplication,
        create: guideApplication,
      }),
    );

    await upsertTracked(
      "Guide banking details",
      () => prismaClient.guideBankingDetails.findUnique({
        where: { guideProfileId: profile.id },
      }),
      () => prismaClient.guideBankingDetails.upsert({
        where: { guideProfileId: profile.id },
        update: {
          bankName: guide.bankName,
          accountHolder: guide.accountHolder,
          accountNumberEncrypted: encryptedBankAccount,
          branchCode: "250655",
          accountType: "Cheque",
        },
        create: {
          guideProfileId: profile.id,
          bankName: guide.bankName,
          accountHolder: guide.accountHolder,
          accountNumberEncrypted: encryptedBankAccount,
          branchCode: "250655",
          accountType: "Cheque",
        },
      }),
    );
  }

  const experienceData = [
    {
      slug: "joburg-heritage-walk",
      title: "Johannesburg Heritage Walking Tour",
      guideEmail: "guide1@nomsatourguides.co.za",
      categorySlug: "walking-tours",
      destinationSlug: "johannesburg-city-centre",
      durationMinutes: 180,
      price: "650.00",
      maxGuests: 10,
      meetingPoint: "Constitution Hill, Johannesburg",
      image: "johannesburg-skyline.jpg",
      altText: "Johannesburg city skyline",
    },
    {
      slug: "cape-town-vineyard-day",
      title: "Cape Town and Winelands Discovery",
      guideEmail: "guide2@nomsatourguides.co.za",
      categorySlug: "wine-tours",
      destinationSlug: "stellenbosch-winelands",
      durationMinutes: 360,
      price: "1450.00",
      maxGuests: 8,
      meetingPoint: "Stellenbosch Town Hall",
      image: "cape-winelands-vineyard.jpg",
      altText: "Vineyards in the Cape Winelands",
    },
    {
      slug: "durban-food-and-culture",
      title: "Durban Food and Cultural Walk",
      guideEmail: "guide2@nomsatourguides.co.za",
      categorySlug: "food-tours",
      destinationSlug: "durban-city",
      durationMinutes: 240,
      price: "850.00",
      maxGuests: 8,
      meetingPoint: "Durban City Hall",
      image: "durban-bunny-chow.jpg",
      altText: "Durban bunny chow",
    },
    {
      slug: "pretoria-cultural-highlights",
      title: "Pretoria Cultural Highlights",
      guideEmail: "guide1@nomsatourguides.co.za",
      categorySlug: "cultural-tours",
      destinationSlug: "pretoria-city",
      durationMinutes: 210,
      price: "720.00",
      maxGuests: 10,
      meetingPoint: "Church Square, Pretoria",
      image: "cape-town-bo-kaap.jpg",
      altText: "Colourful historic South African neighbourhood",
    },
  ] as const;

  const experiences = new Map<string, { id: string; guideId: string; price: string }>();
  const availabilityIds = new Map<string, string[]>();
  for (const experience of experienceData) {
    const guide = guideProfiles.get(experience.guideEmail);
    const categoryId = categories.get(experience.categorySlug);
    const destinationId = destinations.get(experience.destinationSlug);
    if (!guide || !categoryId || !destinationId) {
      throw new Error(`Missing guide, category, or destination for ${experience.slug}.`);
    }
    const data = {
      guideId: guide.id,
      categoryId,
      destinationId,
      title: experience.title,
      description: `${experience.title}, led by an approved local guide. Discover South African history, neighbourhoods, and local culture in a small group.`,
      durationMinutes: experience.durationMinutes,
      price: experience.price,
      currency: "ZAR",
      maxGuests: experience.maxGuests,
      minGuests: 1,
      meetingPoint: experience.meetingPoint,
      inclusions: ["Local guide", "Bottled water"],
      exclusions: ["Transport to the meeting point", "Personal purchases"],
      requirements: ["Comfortable walking shoes"],
      cancellationPolicy: "Full refund up to 24 hours before the experience.",
      status: "PUBLISHED" as const,
      verificationStatus: "APPROVED" as const,
      featured: false,
      deletedAt: null,
    };
    const created = await upsertTracked(
      "Experiences",
      () => prismaClient.experience.findUnique({ where: { slug: experience.slug } }),
      () => prismaClient.experience.upsert({
        where: { slug: experience.slug },
        update: data,
        create: { slug: experience.slug, ...data },
      }),
    );
    experiences.set(experience.slug, {
      id: created.id,
      guideId: guide.id,
      price: experience.price,
    });

    const filename = experience.image.replace(/\.[^.]+$/, "");
    const storageKey = `nomsa/experiences/${created.id}/${filename}`;
    await upsertTracked(
      "Experience images",
      () => prismaClient.experienceImage.findUnique({ where: { storageKey } }),
      () => prismaClient.experienceImage.upsert({
        where: { storageKey },
        update: { experienceId: created.id, altText: experience.altText, sortOrder: 0 },
        create: {
          experienceId: created.id,
          storageKey,
          altText: experience.altText,
          sortOrder: 0,
        },
      }),
    );

    const experienceAvailabilityIds: string[] = [];
    for (let slot = 0; slot < AVAILABILITY_DATES.length; slot += 1) {
      const date = AVAILABILITY_DATES[slot];
      const timeSlot = slot === 0 ? "09:00" : "13:00";
      const id = seedId(`availability:${experience.slug}:${slot}`);
      experienceAvailabilityIds.push(id);
      const availabilityData = {
        experienceId: created.id,
        date,
        timeSlot,
        availableSlots: 8,
        remainingCapacity: 8,
      };
      await upsertTracked(
        "Availability slots",
        () => prismaClient.availability.findUnique({ where: { id } }),
        () => prismaClient.availability.upsert({
          where: { id },
          update: availabilityData,
          create: { id, ...availabilityData },
        }),
      );
    }
    availabilityIds.set(experience.slug, experienceAvailabilityIds);
  }

  const instantExperience = experiences.get("joburg-heritage-walk");
  const guideProfile = guideProfiles.get("guide1@nomsatourguides.co.za");
  if (!instantExperience || !guideProfile) {
    throw new Error("The seed completed-booking experience or guide is missing.");
  }
  const bookingIdempotencyKeyHash = createHash("sha256")
    .update("nomsa-seed:completed-customer-booking")
    .digest("hex");
  const bookingRequestHash = createHash("sha256")
    .update("nomsa-seed:completed-customer-booking-request")
    .digest("hex");
  const booking = await upsertTracked(
    "Bookings",
    () => prismaClient.booking.findUnique({
      where: { idempotencyKeyHash: bookingIdempotencyKeyHash },
    }),
    () => prismaClient.booking.upsert({
      where: { idempotencyKeyHash: bookingIdempotencyKeyHash },
      update: {
        requestHash: bookingRequestHash,
        customerId: customer.id,
        guideId: guideProfile.id,
        experienceId: instantExperience.id,
        experienceDate: COMPLETED_EXPERIENCE_DATE,
        travellerCount: 2,
        adultsCount: 2,
        childrenCount: 0,
        timeSlot: "09:00",
        totalPrice: instantExperience.price,
        baseAmount: instantExperience.price,
        optionalExtrasAmount: "0.00",
        transportAmount: "0.00",
        platformFeeAmount: "65.00",
        taxAmount: "0.00",
        bookingType: "INSTANT",
        cancellationPolicySnapshot: "Full refund up to 24 hours before the experience.",
        agreedTermsSnapshot: { version: "seed-v1", accepted: true },
        currency: "ZAR",
        status: "COMPLETED",
        paymentStatus: "SUCCEEDED",
        reservationExpiresAt: null,
        serviceCompletedAt: COMPLETED_AT,
      },
      create: {
        idempotencyKeyHash: bookingIdempotencyKeyHash,
        requestHash: bookingRequestHash,
        customerId: customer.id,
        guideId: guideProfile.id,
        experienceId: instantExperience.id,
        availabilityId: null,
        experienceDate: COMPLETED_EXPERIENCE_DATE,
        travellerCount: 2,
        adultsCount: 2,
        childrenCount: 0,
        timeSlot: "09:00",
        totalPrice: instantExperience.price,
        baseAmount: instantExperience.price,
        optionalExtrasAmount: "0.00",
        transportAmount: "0.00",
        platformFeeAmount: "65.00",
        taxAmount: "0.00",
        bookingType: "INSTANT",
        cancellationPolicySnapshot: "Full refund up to 24 hours before the experience.",
        agreedTermsSnapshot: { version: "seed-v1", accepted: true },
        currency: "ZAR",
        status: "COMPLETED",
        paymentStatus: "SUCCEEDED",
        serviceCompletedAt: COMPLETED_AT,
      },
    }),
  );

  const requestExperience = experiences.get("durban-food-and-culture");
  const requestAvailabilityId = availabilityIds.get("durban-food-and-culture")?.[0];
  const requestGuide = guideProfiles.get("guide2@nomsatourguides.co.za");
  if (!requestExperience || !requestAvailabilityId || !requestGuide) {
    throw new Error("The seed request-booking experience, availability, or guide is missing.");
  }
  const requestBookingIdempotencyKeyHash = createHash("sha256")
    .update("nomsa-seed:request-customer-booking")
    .digest("hex");
  const requestBookingRequestHash = createHash("sha256")
    .update("nomsa-seed:request-customer-booking-request")
    .digest("hex");
  const requestExperienceDate = new Date(AVAILABILITY_DATES[0]);
  requestExperienceDate.setUTCHours(9, 0, 0, 0);
  const requestBookingData = {
    requestHash: requestBookingRequestHash,
    customerId: customer.id,
    guideId: requestGuide.id,
    experienceId: requestExperience.id,
    availabilityId: requestAvailabilityId,
    experienceDate: requestExperienceDate,
    travellerCount: 2,
    adultsCount: 2,
    childrenCount: 0,
    timeSlot: "09:00",
    totalPrice: requestExperience.price,
    baseAmount: requestExperience.price,
    optionalExtrasAmount: "0.00",
    transportAmount: "0.00",
    platformFeeAmount: "85.00",
    taxAmount: "0.00",
    bookingType: "REQUEST_TO_BOOK" as const,
    cancellationPolicySnapshot: "Full refund up to 24 hours before the experience.",
    agreedTermsSnapshot: { version: "seed-v1", accepted: true },
    currency: "ZAR",
    status: "PENDING" as const,
    paymentStatus: "PENDING" as const,
    reservationExpiresAt: null,
    serviceCompletedAt: null,
  };
  const requestBooking = await upsertTracked(
    "Bookings",
    () => prismaClient.booking.findUnique({
      where: { idempotencyKeyHash: requestBookingIdempotencyKeyHash },
    }),
    () => prismaClient.booking.upsert({
      where: { idempotencyKeyHash: requestBookingIdempotencyKeyHash },
      update: requestBookingData,
      create: {
        idempotencyKeyHash: requestBookingIdempotencyKeyHash,
        ...requestBookingData,
      },
    }),
  );

  const guestId = seedId("booking-guest:completed-customer-booking");
  await upsertTracked(
    "Booking guests",
    () => prismaClient.bookingGuest.findUnique({ where: { id: guestId } }),
    () => prismaClient.bookingGuest.upsert({
      where: { id: guestId },
      update: {
        bookingId: booking.id,
        fullName: "Test Customer",
        email: "customer@nomsatourguides.co.za",
        phone: "+27 10 000 0002",
      },
      create: {
        id: guestId,
        bookingId: booking.id,
        fullName: "Test Customer",
        email: "customer@nomsatourguides.co.za",
        phone: "+27 10 000 0002",
      },
    }),
  );

  const requestGuestId = seedId("booking-guest:request-customer-booking");
  await upsertTracked(
    "Booking guests",
    () => prismaClient.bookingGuest.findUnique({ where: { id: requestGuestId } }),
    () => prismaClient.bookingGuest.upsert({
      where: { id: requestGuestId },
      update: {
        bookingId: requestBooking.id,
        fullName: "Test Customer",
        email: "customer@nomsatourguides.co.za",
        phone: "+27 10 000 0002",
      },
      create: {
        id: requestGuestId,
        bookingId: requestBooking.id,
        fullName: "Test Customer",
        email: "customer@nomsatourguides.co.za",
        phone: "+27 10 000 0002",
      },
    }),
  );

  const paymentReference = "NOMSA-SEED-COMPLETED-BOOKING";
  const paymentAmount = instantExperience.price;
  await upsertTracked(
    "Payments",
    () => prismaClient.payment.findUnique({ where: { paymentReference } }),
    () => prismaClient.payment.upsert({
      where: { paymentReference },
      update: {
        bookingId: booking.id,
        amount: paymentAmount,
        refundedAmount: "0.00",
        currency: "ZAR",
        status: "SUCCEEDED",
        paidAt: COMPLETED_AT,
      },
      create: {
        bookingId: booking.id,
        paymentReference,
        amount: paymentAmount,
        refundedAmount: "0.00",
        currency: "ZAR",
        status: "SUCCEEDED",
        paidAt: COMPLETED_AT,
      },
    }),
  );

  const requestPaymentReference = "NOMSA-SEED-REQUEST-BOOKING";
  await upsertTracked(
    "Payments",
    () => prismaClient.payment.findUnique({
      where: { paymentReference: requestPaymentReference },
    }),
    () => prismaClient.payment.upsert({
      where: { paymentReference: requestPaymentReference },
      update: {
        bookingId: requestBooking.id,
        amount: requestExperience.price,
        refundedAmount: "0.00",
        currency: "ZAR",
        status: "PENDING",
        paidAt: null,
      },
      create: {
        bookingId: requestBooking.id,
        paymentReference: requestPaymentReference,
        amount: requestExperience.price,
        refundedAmount: "0.00",
        currency: "ZAR",
        status: "PENDING",
        paidAt: null,
      },
    }),
  );

  await upsertTracked(
    "Payouts",
    () => prismaClient.payout.findUnique({ where: { bookingId: booking.id } }),
    () => prismaClient.payout.upsert({
      where: { bookingId: booking.id },
      update: {
        guideId: guideProfile.id,
        amount: "585.00",
        grossAmount: paymentAmount,
        commissionAmount: "65.00",
        commissionRate: "0.1000",
        currency: "ZAR",
        status: "PENDING",
        eligibleAt: new Date(COMPLETED_AT.getTime() + 7 * 86_400_000),
      },
      create: {
        bookingId: booking.id,
        guideId: guideProfile.id,
        amount: "585.00",
        grossAmount: paymentAmount,
        commissionAmount: "65.00",
        commissionRate: "0.1000",
        currency: "ZAR",
        status: "PENDING",
        eligibleAt: new Date(COMPLETED_AT.getTime() + 7 * 86_400_000),
      },
    }),
  );
  console.log("\n[seed] Summary:");
  for (const [label, item] of counts) {
    console.log(`  [seed] created: ${item.created}, existing: ${item.existing} — ${label}`);
  }
  console.log(`  Admin TOTP secret (configure in an authenticator app): ${ADMIN_TOTP_SECRET}`);
  console.log("  Seed users: admin@nomsatourguides.co.za, customer@nomsatourguides.co.za, guide1@nomsatourguides.co.za, guide2@nomsatourguides.co.za");
}

seed()
  .catch((error: unknown) => {
    console.error("[seed] Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
