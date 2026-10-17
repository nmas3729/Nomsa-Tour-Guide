import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getServerEnvironment } from "@/src/config/env";
import { imageUploadSchema, MAX_UPLOAD_FILE_SIZE } from "@/src/features/uploads/schemas";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import { ImageUploadError, uploadImageForUser } from "@/src/server/services/image-upload-service";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";

const MAX_REQUEST_SIZE = MAX_UPLOAD_FILE_SIZE + 32_768;

async function readLimitedFormData(request: Request): Promise<FormData> {
  const reader = request.body?.getReader();
  if (!reader) {
    throw new ImageUploadError("An image file is required.", 400);
  }

  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_REQUEST_SIZE) {
      await reader.cancel();
      throw new ImageUploadError("Image upload is too large.", 400);
    }
    chunks.push(value);
  }

  const body = Buffer.concat(chunks);
  return new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body,
  }).formData();
}

export async function POST(request: Request) {
  const applicationUrl = getServerEnvironment().NEXT_PUBLIC_APP_URL;
  if (!applicationUrl) {
    return NextResponse.json({ error: "Image upload is not configured." }, { status: 503 });
  }
  if (!isSameOriginRequest(request, applicationUrl)) {
    return NextResponse.json({ error: "Cross-origin image uploads are not allowed." }, { status: 403 });
  }

  const principal = await getCurrentUser();
  if (!principal) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  if (!hasVerifiedAuthenticator(principal)) {
    return NextResponse.json(
      { error: "Two-factor authentication is required for this account." },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: "Image upload is too large." }, { status: 413 });
  }

  try {
    const formData = await readLimitedFormData(request);
    const parsed = imageUploadSchema.safeParse({
      purpose: formData.get("purpose"),
      file: formData.get("file"),
      experienceId: formData.get("experienceId") || undefined,
      altText: formData.get("altText") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Image upload details are invalid.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const image = await uploadImageForUser(principal, parsed.data);
    return NextResponse.json({ image }, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: "image.upload.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "Image upload could not be completed." }, { status: 500 });
  }
}
