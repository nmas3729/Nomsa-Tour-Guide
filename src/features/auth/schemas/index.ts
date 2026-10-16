import { z } from "zod";
import { UserRole } from "@/src/server/db/generated/enums";

const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.")
  .regex(/[^a-zA-Z0-9]/, "Include a symbol.");

const baseRegistration = {
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: passwordSchema,
  confirmPassword: z.string(),
};

export const customerRegistrationSchema = z
  .object({
    ...baseRegistration,
    role: z.literal(UserRole.CUSTOMER),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const guideRegistrationSchema = z
  .object({
    ...baseRegistration,
    role: z.literal(UserRole.GUIDE),
    phone: z.string().trim().min(7, "Enter a valid phone number.").max(30),
    biography: z.string().trim().min(40, "Tell travellers a little more about your experience (at least 40 characters).").max(4000),
    yearsExperience: z.coerce.number().int().min(0).max(80),
    emergencyContactName: z.string().trim().min(2).max(100),
    emergencyContactPhone: z.string().trim().min(7).max(30),
    businessName: z.string().trim().max(150).optional(),
    businessRegistration: z.string().trim().max(100).optional(),
    specialties: z.string().max(1000).optional(),
    languages: z.string().max(500).optional(),
    operatingAreas: z.string().max(1000).optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const registrationSchema = z
  .object({
    ...baseRegistration,
    role: z.enum([UserRole.CUSTOMER, UserRole.GUIDE]),
    phone: z.string().optional(),
    biography: z.string().optional(),
    yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    businessName: z.string().optional(),
    businessRegistration: z.string().optional(),
    specialties: z.string().optional(),
    languages: z.string().optional(),
    operatingAreas: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }

    if (values.role === UserRole.GUIDE) {
      const guideValues = guideRegistrationSchema.safeParse(values);
      if (!guideValues.success) {
        for (const issue of guideValues.error.issues) {
          if (
            ["name", "email", "password", "confirmPassword"].includes(
              String(issue.path[0]),
            )
          ) {
            continue;
          }
          context.addIssue({
            code: "custom",
            message: issue.message,
            path: issue.path,
          });
        }
      }
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  callbackUrl: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(256),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const emailVerificationSchema = z.object({
  token: z.string().min(32).max(256),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export type RegistrationInput = z.input<typeof registrationSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResendVerificationInput = z.input<typeof resendVerificationSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
