import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isInvoiceAvailable } from "@/src/components/booking/booking-confirmation-state";
import { getBookingConfirmation } from "@/src/server/services/booking-service";
import { generateInvoicePdf, invoiceDocumentData } from "@/src/server/services/invoice-pdf-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invoice not available." }, { status: 404 });
  }

  try {
    const access = await cookies();
    const key = access.get(`booking-access-${id}`)?.value;
    const booking = await getBookingConfirmation(id, key);
    if (!booking) {
      return NextResponse.json(
        { error: "Invoice not available." },
        { status: 404, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (!isInvoiceAvailable(booking)) {
      return NextResponse.json(
        { error: "An invoice is available only for an approved payment." },
        { status: 409, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const pdf = generateInvoicePdf(invoiceDocumentData(booking));
    const reference = booking.reference.replace(/[^A-Za-z0-9-]/g, "");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${reference || id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "booking.invoice_download.failed",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { error: "Invoice download is temporarily unavailable." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
