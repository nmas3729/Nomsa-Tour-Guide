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

export function generateInvoicePdf(invoice: InvoiceDocumentData): Buffer {
  const amount = `${invoice.currency} ${invoice.amount.toFixed(2)}`;
  const paidDate = invoice.paidAt ? invoice.paidAt.slice(0, 10) : "Not recorded";
  const lines = [
    pdfLine("Nomsa Tour Guides", 54, 790, 20),
    pdfLine("INVOICE", 54, 750, 16),
    pdfLine(`Booking reference: ${invoice.reference || "Not available"}`, 54, 720, 11),
    pdfLine(`Customer: ${invoice.customerName || "Not listed"}`, 54, 695, 11),
    pdfLine(`Email: ${invoice.customerEmail || "Not listed"}`, 54, 678, 11),
    pdfLine(`Experience: ${invoice.experienceTitle || "Not listed"}`, 54, 645, 11),
    pdfLine(`Destination: ${invoice.destination || "Not listed"}`, 54, 628, 11),
    pdfLine(`Booking date: ${invoice.bookingDate || "Not listed"}`, 54, 611, 11),
    pdfLine(`Time: ${invoice.timeSlot || "Not listed"}`, 54, 594, 11),
    pdfLine(`Travellers: ${invoice.travellerCount || "Not listed"}`, 54, 577, 11),
    pdfLine(`Payment status: ${invoice.paymentStatus}`, 54, 544, 11),
    pdfLine(`Invoice date (payment approval date): ${paidDate}`, 54, 527, 11),
    pdfLine(`Amount: ${amount}`, 54, 494, 14),
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
