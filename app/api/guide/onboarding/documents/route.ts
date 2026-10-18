import { NextResponse } from "next/server";
import { enforceAuthRateLimits, RateLimitExceededError } from "@/src/features/auth/lib/rate-limit";
import { guideDocumentTypeSchema } from "@/src/features/auth/guide-onboarding-schema";
import { getServerEnvironment } from "@/src/config/env";
import { getCurrentUser } from "@/src/lib/auth/session";
import { isSameOriginRequest } from "@/src/lib/security/origin";
import {
  GuideOnboardingError,
  storeGuideDocument,
} from "@/src/server/services/guide-onboarding-service";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_DOCUMENT_BYTES + 32_768;
const supportedTypes = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
]);

async function boundedFormData(request: Request): Promise<FormData> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("A document file is required.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new Error("Document upload exceeds the 10 MB limit.");
    }
    chunks.push(value);
  }
  return new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: Buffer.concat(chunks),
  }).formData();
}

function contentMatchesType(content: Buffer, type: string): boolean {
  if (type === "application/pdf") return content.subarray(0, 5).toString("ascii") === "%PDF-";
  if (type === "image/jpeg") return content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  if (type === "image/png") {
    return content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return false;
}

export async function POST(request: Request) {
  const appUrl = getServerEnvironment().NEXT_PUBLIC_APP_URL;
  if (!appUrl || !isSameOriginRequest(request, appUrl)) {
    return NextResponse.json({ error: "Cross-origin uploads are not allowed." }, { status: 403 });
  }
  const principal = await getCurrentUser();
  if (!principal) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Document upload exceeds the 10 MB limit." }, { status: 413 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientAddress =
    request.headers.get("x-real-ip") ??
    forwardedFor?.split(",").at(-1)?.trim() ??
    "unknown";
  try {
    await enforceAuthRateLimits({
      action: "guide-document-upload",
      identifier: principal.id,
      clientAddress,
      limit: 5,
      addressLimit: 15,
      windowMs: 15 * 60 * 1000,
    });
    const formData = await boundedFormData(request);
    const documentType = guideDocumentTypeSchema.safeParse(formData.get("documentType"));
    const file = formData.get("file");
    if (!documentType.success || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Select a document and a supported document type." }, { status: 400 });
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json({ error: "Document upload exceeds the 10 MB limit." }, { status: 413 });
    }
    if (!supportedTypes.has(file.type)) {
      return NextResponse.json({ error: "Use a PDF, JPEG, or PNG document." }, { status: 400 });
    }
    const content = Buffer.from(await file.arrayBuffer());
    if (!contentMatchesType(content, file.type)) {
      return NextResponse.json({ error: "The file content does not match its declared type." }, { status: 400 });
    }

    const document = await storeGuideDocument(principal, {
      documentType: documentType.data,
      originalFilename: file.name,
      mimeType: file.type,
      content,
    });
    return NextResponse.json(
      { document },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof GuideOnboardingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message.includes("10 MB")) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    console.error(JSON.stringify({
      event: "guide.document.upload_failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json({ error: "The document could not be uploaded." }, { status: 500 });
  }
}
