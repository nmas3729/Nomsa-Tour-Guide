import { processPayFastITN } from "@/src/server/services/booking-service";
import { sendApprovedBookingInvoice } from "@/src/server/services/invoice-email-service";

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
      return new Response("ITN must use application/x-www-form-urlencoded.", { status: 415 });
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 65_536) {
      return new Response("ITN payload is too large.", { status: 413 });
    }
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 65_536) {
      return new Response("ITN payload is too large.", { status: 413 });
    }
    const searchParams = new URLSearchParams(rawBody);

    const itnData: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (Object.hasOwn(itnData, key)) {
        return new Response("Duplicate ITN parameter.", { status: 400 });
      }
      itnData[key] = value;
    }

    const result = await processPayFastITN(itnData, rawBody, request.headers.get("x-real-ip"));

    if (!result.success) {
      return new Response(result.reason || "Invalid ITN notification", { status: 400 });
    }

    if (
      itnData.payment_status === "COMPLETE" &&
      itnData.m_payment_id &&
      !("latePayment" in result && result.latePayment)
    ) {
      try {
        await sendApprovedBookingInvoice(itnData.m_payment_id);
      } catch (error) {
        console.error(JSON.stringify({
          event: "booking.invoice_email.failed",
          errorName: error instanceof Error ? error.name : "UnknownError",
        }));
      }
    }

    // PayFast expects a 200 OK
    return new Response("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "payfast.itn.processing_failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return new Response(
      "ITN processing failed.",
      { status: 500 },
    );
  }
}
