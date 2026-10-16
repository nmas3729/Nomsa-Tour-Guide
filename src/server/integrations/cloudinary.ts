import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { requireCloudinaryEnvironment } from "@/src/config/env";

export class CloudinaryConfigurationError extends Error {
  constructor() {
    super("Cloudinary image storage is not configured.");
    this.name = "CloudinaryConfigurationError";
  }
}

function configuredCloudinary() {
  try {
    const environment = requireCloudinaryEnvironment();
    cloudinary.config({
      cloud_name: environment.CLOUDINARY_CLOUD_NAME,
      api_key: environment.CLOUDINARY_API_KEY,
      api_secret: environment.CLOUDINARY_API_SECRET,
      secure: true,
    });
    return cloudinary;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required Cloudinary")) {
      throw new CloudinaryConfigurationError();
    }
    throw error;
  }
}

export async function uploadCloudinaryImage(file: File, folder: string) {
  const provider = configuredCloudinary();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const encodedFile = `data:${file.type};base64,${fileBuffer.toString("base64")}`;
  const result = await provider.uploader.upload(encodedFile, {
    folder,
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    unique_filename: true,
    overwrite: false,
  });

  return {
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    url: provider.url(result.public_id, {
      secure: true,
      transformation: [{ width: 2400, height: 2400, crop: "limit", quality: "auto", fetch_format: "auto" }],
    }),
  };
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  await configuredCloudinary().uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}
