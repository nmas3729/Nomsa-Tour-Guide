import type { BookingRecordSummary } from "@/src/server/services/booking-service";

export interface InvoiceDocumentData {
  reference: string;
  customerName: string;
  customerEmail: string;
  experienceTitle: string;
  destination: string;
  bookingDate: string;
  timeSlot: string;
  travellerCount: number;
  amount: number;
  currency: string;
  paymentStatus: string;
  paidAt: string;
  refundedAmount: number;
  baseAmount: number | null;
  optionalExtrasAmount: number | null;
  transportAmount: number | null;
  platformFeeAmount: number | null;
  taxAmount: number | null;
  cancellationPolicySnapshot: string | null;
}

export function invoiceDocumentData(booking: BookingRecordSummary): InvoiceDocumentData {
  return {
    reference: booking.reference,
    customerName: booking.leadName,
    customerEmail: booking.leadEmail,
    experienceTitle: booking.experienceTitle,
    destination: booking.destination,
    bookingDate: booking.date,
    timeSlot: booking.timeSlot,
    travellerCount: booking.travellerCount,
    amount: booking.paidAmount ?? booking.totalPrice,
    currency: booking.paidCurrency ?? booking.currency,
    paymentStatus: booking.paymentStatus,
    paidAt: booking.paidAt ?? "",
    refundedAmount: booking.refundedAmount ?? 0,
    baseAmount: booking.baseAmount ?? null,
    optionalExtrasAmount: booking.optionalExtrasAmount ?? null,
    transportAmount: booking.transportAmount ?? null,
    platformFeeAmount: booking.platformFeeAmount ?? null,
    taxAmount: booking.taxAmount ?? null,
    cancellationPolicySnapshot: booking.cancellationPolicySnapshot ?? null,
  };
}

function safeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function pdfLine(text: string, x: number, y: number, size: number): string {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${safeText(text)}) Tj ET`;
}

function wrappedLines(value: string, maxLength: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function generateInvoicePdf(invoice: InvoiceDocumentData): Buffer {
  const amount = `${invoice.currency} ${invoice.amount.toFixed(2)}`;
  const paidDate = invoice.paidAt ? invoice.paidAt.slice(0, 10) : "Not recorded";
  const cancellationLines = wrappedLines(
    `Cancellation terms: ${invoice.cancellationPolicySnapshot || "Not recorded"}`,
    100,
  ).map((line, index) => pdfLine(line, 54, 350 - index * 10, 8));
  const lines = [
    pdfLine("Nomsa Tour Guides", 54, 790, 20),
    pdfLine("PAYMENT RECEIPT", 54, 750, 16),
    pdfLine(`Booking reference: ${invoice.reference || "Not available"}`, 54, 720, 11),
    pdfLine(`Customer: ${invoice.customerName || "Not listed"}`, 54, 695, 11),
    pdfLine(`Email: ${invoice.customerEmail || "Not listed"}`, 54, 678, 11),
    pdfLine(`Experience: ${invoice.experienceTitle || "Not listed"}`, 54, 645, 11),
    pdfLine(`Destination: ${invoice.destination || "Not listed"}`, 54, 628, 11),
    pdfLine(`Booking date: ${invoice.bookingDate || "Not listed"}`, 54, 611, 11),
    pdfLine(`Time: ${invoice.timeSlot || "Not listed"}`, 54, 594, 11),
    pdfLine(`Travellers: ${invoice.travellerCount || "Not listed"}`, 54, 577, 11),
    pdfLine(`Payment status: ${invoice.paymentStatus}`, 54, 544, 11),
    pdfLine(`Receipt date (payment approval date): ${paidDate}`, 54, 527, 11),
    pdfLine(`Base price: ${invoice.baseAmount === null ? "Unavailable" : `${invoice.currency} ${invoice.baseAmount.toFixed(2)}`}`, 54, 494, 10),
    pdfLine(`Optional extras: ${invoice.optionalExtrasAmount === null ? "Unavailable" : `${invoice.currency} ${invoice.optionalExtrasAmount.toFixed(2)}`}`, 54, 477, 10),
    pdfLine(`Transport: ${invoice.transportAmount === null ? "Unavailable" : `${invoice.currency} ${invoice.transportAmount.toFixed(2)}`}`, 54, 460, 10),
    pdfLine(`Platform fee: ${invoice.platformFeeAmount === null ? "Unavailable" : `${invoice.currency} ${invoice.platformFeeAmount.toFixed(2)}`}`, 54, 443, 10),
    pdfLine(`Taxes: ${invoice.taxAmount === null ? "Unavailable" : `${invoice.currency} ${invoice.taxAmount.toFixed(2)}`}`, 54, 426, 10),
    pdfLine(`Total paid: ${amount}`, 54, 405, 14),
    pdfLine(`Refund recorded: ${invoice.currency} ${invoice.refundedAmount.toFixed(2)}`, 54, 385, 10),
    ...cancellationLines,
    pdfLine("Billing: billing@nomsatourguides.co.za", 54, 80, 9),
    pdfLine("nomsatourguides.co.za", 54, 64, 9),
    pdfLine("WhatsApp: +27 66 485 8827", 54, 48, 9),
  ];
  const stream = `${lines.join("\n")}\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "ascii");
}
