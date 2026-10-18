import { z } from "zod";

export const customRequestOfferSnapshotSchema = z.object({
  experienceTitle: z.string().min(1),
  experienceSlug: z.string().min(1),
  description: z.string().min(1).optional(),
  destination: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  meetingPoint: z.string().nullable(),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  cancellationPolicy: z.string().min(1),
  currency: z.string().length(3),
}).strict();

export type CustomRequestOfferSnapshot = z.infer<typeof customRequestOfferSnapshotSchema>;
