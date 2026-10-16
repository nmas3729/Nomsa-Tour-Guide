import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Choose a valid date.")
  .refine((value) => value >= new Date().toISOString().slice(0, 10), "Choose a future date.");

export const createBookingSchema = z
  .object({
    experienceSlug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    date: dateSchema,
    timeSlot: z.enum(["09:00 AM", "02:00 PM"]),
    adultsCount: z.number().int().min(1).max(10),
    childrenCount: z.number().int().min(0).max(9),
    leadTraveller: z
      .object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email: z.string().trim().toLowerCase().email().max(254),
        phone: z.string().trim().min(7).max(30),
        country: z.string().trim().min(2).max(100),
      })
      .strict(),
    emergencyContact: z
      .object({
        name: z.string().trim().min(2).max(100),
        phone: z.string().trim().min(7).max(30),
      })
      .strict(),
    dietary: z.string().trim().max(1000).optional(),
    accessibility: z.boolean().optional(),
    specialRequests: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine((input) => input.adultsCount + input.childrenCount <= 10, {
    message: "A booking can include no more than 10 travellers.",
    path: ["childrenCount"],
  });

export const idempotencyKeySchema = z.string().uuid();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
