import { describe, expect, it } from "vitest";
import { generateInvoicePdf, type InvoiceDocumentData } from "./invoice-pdf-service";

const invoice: InvoiceDocumentData = {
  reference: "NOM-ABC123",
  customerName: "Alex Traveller",
  customerEmail: "alex@example.com",
  experienceTitle: "Bo-Kaap local walk",
  destination: "Cape Town, Western Cape",
  bookingDate: "2026-12-12",
  timeSlot: "09:00 AM",
  travellerCount: 2,
  amount: 2400,
  currency: "ZAR",
  paymentStatus: "SUCCEEDED",
  paidAt: "2026-10-17T08:12:00.000Z",
};

describe("invoice PDF generation", () => {
  it("creates a downloadable PDF from the approved booking facts", () => {
    const pdf = generateInvoicePdf(invoice);
    const content = pdf.toString("ascii");

    expect(content.startsWith("%PDF-1.4")).toBe(true);
    expect(content).toContain("Booking reference: NOM-ABC123");
    expect(content).toContain("Experience: Bo-Kaap local walk");
    expect(content).toContain("Destination: Cape Town, Western Cape");
    expect(content).toContain("Travellers: 2");
    expect(content).toContain("Payment status: SUCCEEDED");
    expect(content).toContain("Invoice date \\(payment approval date\\): 2026-10-17");
    expect(content).toContain("Amount: ZAR 2400.00");
    expect(content).toContain("billing@nomsatourguides.co.za");
    expect(content).toContain("+27 66 485 8827");
    expect(content.endsWith("%%EOF")).toBe(true);
  });

  it("escapes PDF syntax in customer-provided values", () => {
    const pdf = generateInvoicePdf({ ...invoice, customerName: "Alex (Traveller)" });

    expect(pdf.toString("ascii")).toContain("Customer: Alex \\(Traveller\\)");
  });
});
