import { z } from "zod";

const textList = z.array(z.string().trim().min(1).max(120)).max(30);

export const guideOnboardingSchema = z.object({
  action: z.enum(["save_draft", "submit"]),
  phone: z.string().trim().max(30),
  biography: z.string().trim().max(4000),
  yearsExperience: z.number().int().min(0).max(80),
  languages: textList,
  operatingAreas: textList,
  qualifications: textList,
  specialties: textList,
  bankName: z.string().trim().max(120),
  bankAccountHolder: z.string().trim().max(120),
  bankAccountNumber: z.string().trim().max(80),
  bankBranchCode: z.string().trim().max(30),
  bankAccountType: z.string().trim().max(60),
  permitsRequired: z.boolean(),
  serviceTitle: z.string().trim().max(160),
  serviceDescription: z.string().trim().max(5000),
  serviceCategoryId: z.union([z.string().uuid(), z.literal("")]),
  serviceDestinationId: z.union([z.string().uuid(), z.literal("")]),
  serviceCancellationPolicy: z.string().trim().max(4000),
  serviceDurationMinutes: z.number().int().min(0).max(1440),
  serviceMeetingPoint: z.string().trim().max(500),
  serviceMinGuests: z.number().int().min(0).max(10),
  serviceMaxGuests: z.number().int().min(0).max(10),
  serviceInclusions: textList,
  serviceExclusions: textList,
  servicePrice: z.string().regex(/^\d{0,10}(?:\.\d{1,2})?$/, "Enter a valid price."),
});

export type GuideOnboardingInput = z.infer<typeof guideOnboardingSchema>;

export const guideDocumentTypeSchema = z.enum([
  "GOVERNMENT_ID",
  "GUIDE_REGISTRATION",
  "PERMIT",
  "SUPPORTING_DOCUMENT",
  "BANKING_VERIFICATION",
]);
