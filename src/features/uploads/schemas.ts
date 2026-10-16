import { z } from "zod";

export const MAX_UPLOAD_FILE_SIZE = 8 * 1024 * 1024;

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export const imageUploadSchema = z
  .object({
    purpose: z.enum(["profile-avatar", "experience-image"]),
    file: z.file().max(MAX_UPLOAD_FILE_SIZE).mime([...acceptedImageTypes]),
    experienceId: z.uuid().optional(),
    altText: z.string().trim().min(1).max(300).optional(),
  })
  .superRefine((values, context) => {
    if (values.purpose === "experience-image" && !values.experienceId) {
      context.addIssue({
        code: "custom",
        message: "An experience is required for this image.",
        path: ["experienceId"],
      });
    }
    if (values.purpose === "experience-image" && !values.altText) {
      context.addIssue({
        code: "custom",
        message: "Describe the image for travellers using assistive technology.",
        path: ["altText"],
      });
    }
    if (values.purpose === "profile-avatar" && (values.experienceId || values.altText)) {
      context.addIssue({
        code: "custom",
        message: "Profile images cannot include experience image fields.",
        path: ["purpose"],
      });
    }
  });

export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
