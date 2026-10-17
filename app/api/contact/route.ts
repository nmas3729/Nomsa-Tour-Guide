import { NextResponse } from "next/server";
import { getServerEnvironment } from "@/src/config/env";
import { contactMessageSchema } from "@/src/schemas/contact";
import { sendContactMessage } from "@/src/server/services/contact-email-service";
import { isSameOriginRequest } from "@/src/lib/security/origin";

const MAX_CONTACT_BODY_BYTES = 8_192;

export async function POST(request: Request) {
  const applicationUrl = getServerEnvironment().NEXT_PUBLIC_APP_URL;
  if (!applicationUrl) {
    return NextResponse.json({ error: "Contact form is not configured." }, { status: 503 });
  }
  if (!isSameOriginRequest(request, applicationUrl)) {
    return NextResponse.json({ error: "Cross-origin contact requests are not allowed." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CONTACT_BODY_BYTES) {
    return NextResponse.json({ error: "Contact message is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_CONTACT_BODY_BYTES) {
      return NextResponse.json({ error: "Contact message is too large." }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Contact request must contain valid JSON." }, { status: 400 });
  }

  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the contact form fields." },
      { status: 400 },
    );
  }

  try {
    await sendContactMessage(parsed.data);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(JSON.stringify({
      event: "contact.email.failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }));
    return NextResponse.json({ error: "Your message could not be sent. Please try again shortly." }, { status: 503 });
  }
}
