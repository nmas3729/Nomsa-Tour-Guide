import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth/session";
import {
  downloadGuideDocument,
  GuideOnboardingError,
} from "@/src/server/services/guide-onboarding-service";

function safeDownloadFilename(filename: string): string {
  return filename.replace(/[\r\n"\\]/g, "_").slice(0, 180) || "guide-document";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const principal = await getCurrentUser();
  if (!principal) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  try {
    const document = await downloadGuideDocument(principal, id);
    return new NextResponse(new Uint8Array(document.content), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${safeDownloadFilename(document.filename)}"; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof GuideOnboardingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    console.error(JSON.stringify({
      event: "guide.document.download_failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { error: "Document could not be downloaded." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
