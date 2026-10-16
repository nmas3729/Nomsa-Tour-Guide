import "server-only";

import { UserRole } from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import type { ImageUploadInput } from "@/src/features/uploads/schemas";
import {
  CloudinaryConfigurationError,
  deleteCloudinaryImage,
  uploadCloudinaryImage,
} from "@/src/server/integrations/cloudinary";
import { getPrismaClient } from "@/src/server/db/prisma";

export class ImageUploadError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 503,
  ) {
    super(message);
    this.name = "ImageUploadError";
  }
}

async function removeOrphanedImage(publicId: string): Promise<void> {
  try {
    await deleteCloudinaryImage(publicId);
  } catch (error) {
    console.error(JSON.stringify({
      event: "image.upload.orphan_cleanup_failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
  }
}

export async function uploadImageForUser(
  principal: AuthenticatedPrincipal,
  input: ImageUploadInput,
) {
  const prisma = getPrismaClient();
  const isAdministrator =
    principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN;
  let folder: string;

  if (input.purpose === "experience-image") {
    if (principal.role !== UserRole.GUIDE && !isAdministrator) {
      throw new ImageUploadError("Only guides can upload experience images.", 403);
    }

    const experience = await prisma.experience.findFirst({
      where: {
        id: input.experienceId,
        deletedAt: null,
        ...(isAdministrator ? {} : { guide: { userId: principal.id } }),
      },
      select: { id: true },
    });
    if (!experience) {
      throw new ImageUploadError("Experience not found.", 404);
    }
    folder = `nomsa/experiences/${experience.id}`;
  } else {
    folder = `nomsa/profiles/${principal.id}`;
  }

  let uploadedImage: Awaited<ReturnType<typeof uploadCloudinaryImage>>;
  try {
    uploadedImage = await uploadCloudinaryImage(input.file, folder);
  } catch (error) {
    if (error instanceof CloudinaryConfigurationError) {
      throw new ImageUploadError(error.message, 503);
    }
    console.error(JSON.stringify({
      event: "image.upload.provider_failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    throw new ImageUploadError("The image provider could not accept this upload.", 503);
  }

  const minimumWidth = input.purpose === "experience-image" ? 640 : 96;
  const minimumHeight = input.purpose === "experience-image" ? 360 : 96;
  if (
    uploadedImage.width < minimumWidth ||
    uploadedImage.height < minimumHeight ||
    uploadedImage.width > 10_000 ||
    uploadedImage.height > 10_000
  ) {
    await removeOrphanedImage(uploadedImage.publicId);
    throw new ImageUploadError("Image dimensions do not meet the upload requirements.", 400);
  }

  try {
    if (input.purpose === "profile-avatar") {
      await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
          where: { id: principal.id, deletedAt: null },
          data: { image: uploadedImage.url },
        });
        if (principal.role === UserRole.GUIDE) {
          const updatedGuide = await transaction.guideProfile.updateMany({
            where: { userId: principal.id, deletedAt: null },
            data: { profilePhoto: uploadedImage.url },
          });
          if (updatedGuide.count !== 1) {
            throw new Error("Guide profile is missing for the authenticated guide.");
          }
        }
      });
      return { url: uploadedImage.url };
    }

    const experienceId = input.experienceId;
    const altText = input.altText;
    if (!experienceId || !altText) {
      await removeOrphanedImage(uploadedImage.publicId);
      throw new ImageUploadError("Experience image details are incomplete.", 400);
    }

    const image = await prisma.$transaction(async (transaction) => {
      const experience = await transaction.experience.findFirst({
        where: {
          id: experienceId,
          deletedAt: null,
          ...(isAdministrator ? {} : { guide: { userId: principal.id } }),
        },
        select: { id: true },
      });
      if (!experience) {
        throw new ImageUploadError("Experience not found.", 404);
      }

      const lastImage = await transaction.experienceImage.findFirst({
        where: { experienceId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      return transaction.experienceImage.create({
        data: {
          experienceId,
          storageKey: uploadedImage.publicId,
          altText,
          sortOrder: (lastImage?.sortOrder ?? -1) + 1,
        },
        select: { id: true },
      });
    });
    return { url: uploadedImage.url, imageId: image.id };
  } catch (error) {
    await removeOrphanedImage(uploadedImage.publicId);
    throw error;
  }
}
