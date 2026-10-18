import "server-only";

import { Prisma } from "@/src/server/db/generated/client";
import { PaymentStatus } from "@/src/server/db/generated/enums";
import { requireBillingEmailEnvironment } from "@/src/config/env";
import { getPrismaClient } from "@/src/server/db/prisma";
import { Resend } from "resend";
import {
  bookingInclude,
  toBookingRecordSummary,
} from "@/src/server/services/booking-service";
import { generateInvoicePdf, invoiceDocumentData } from "@/src/server/services/invoice-pdf-service";

const EMAIL_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const BILLING_WHATSAPP_NUMBER = "+27 66 485 8827";
const BILLING_WHATSAPP_URL = "https://wa.me/27664858827";

function metadataWith(
  metadata: Prisma.InputJsonValue | null,
  updates: Record<string, string>,
): Prisma.InputJsonObject {
  const current =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Prisma.InputJsonObject)
      : {};
  return { ...current, ...updates };
}

export async function sendApprovedBookingInvoice(paymentReference: string): Promise<void> {
  const prisma = getPrismaClient();
  const claim = await prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { paymentReference },
      include: { booking: { include: bookingInclude } },
    });
    const lateCapturedPayment =
      payment?.status === PaymentStatus.REFUND_PENDING &&
      payment.booking.status === "REFUND_REQUESTED";
    if (
      !payment ||
      (payment.status !== PaymentStatus.SUCCEEDED && !lateCapturedPayment) ||
      (!lateCapturedPayment &&
        (payment.booking.paymentStatus !== PaymentStatus.SUCCEEDED ||
          !["CONFIRMED", "CHECKED_IN", "COMPLETED", "NO_SHOW"].includes(payment.booking.status))) ||
      !payment.paidAt
    ) {
      return null;
    }

    const metadata =
      payment.metadata &&
      typeof payment.metadata === "object" &&
      !Array.isArray(payment.metadata)
        ? (payment.metadata as Prisma.JsonObject)
        : {};
    if (metadata.invoiceEmailStatus === "SENT") {
      return null;
    }

    const attemptedAt =
      typeof metadata.invoiceEmailAttemptedAt === "string"
        ? Date.parse(metadata.invoiceEmailAttemptedAt)
        : Number.NaN;
    if (
      metadata.invoiceEmailStatus === "SENDING" &&
      Number.isFinite(attemptedAt) &&
      Date.now() - attemptedAt < EMAIL_CLAIM_TIMEOUT_MS
    ) {
      return null;
    }

    const attemptedAtIso = new Date().toISOString();
    await transaction.payment.update({
      where: { id: payment.id },
      data: {
        metadata: metadataWith(payment.metadata, {
          invoiceEmailStatus: "SENDING",
          invoiceEmailAttemptedAt: attemptedAtIso,
        }),
      },
    });

    return {
      paymentId: payment.id,
      summary: toBookingRecordSummary(payment.booking),
      metadata: metadataWith(payment.metadata, {
        invoiceEmailStatus: "SENDING",
        invoiceEmailAttemptedAt: attemptedAtIso,
      }),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (!claim) {
    return;
  }

  let providerAccepted = false;
  try {
    const { RESEND_API_KEY, BILLING_FROM_EMAIL } = requireBillingEmailEnvironment();
    const recipient = claim.summary.leadEmail;
    if (!recipient) {
      throw new Error("Approved booking has no customer email for receipt delivery.");
    }

    const pdf = generateInvoicePdf(invoiceDocumentData(claim.summary));
    const resend = new Resend(RESEND_API_KEY);
    const result = await resend.emails.send(
      {
        from: BILLING_FROM_EMAIL,
        to: recipient,
        subject: `Payment receipt for booking ${claim.summary.reference}`,
        text: [
          `Dear ${claim.summary.leadName || "Traveller"},`,
          "",
          `Attached is the payment receipt for booking ${claim.summary.reference}.`,
          `Experience: ${claim.summary.experienceTitle}`,
          `Destination: ${claim.summary.destination}`,
          `Booking date: ${claim.summary.date} (${claim.summary.timeSlot})`,
          `Travellers: ${claim.summary.travellerCount}`,
          `Amount: ${claim.summary.paidCurrency ?? claim.summary.currency} ${(claim.summary.paidAmount ?? claim.summary.totalPrice).toFixed(2)}`,
          `Payment status: ${claim.summary.paymentStatus}`,
          "",
          `For booking enquiries, WhatsApp ${BILLING_WHATSAPP_NUMBER} (${BILLING_WHATSAPP_URL}) or visit nomsatourguides.co.za.`,
        ].join("\n"),
        attachments: [{
          filename: `receipt-${claim.summary.reference || claim.paymentId}.pdf`,
          content: pdf.toString("base64"),
        }],
      },
      { idempotencyKey: `booking-invoice-${claim.paymentId}` },
    );

    if (result.error) {
      throw new Error(`Resend receipt email failed: ${result.error.name}`);
    }
    providerAccepted = true;

    await prisma.payment.update({
      where: { id: claim.paymentId },
      data: {
        metadata: metadataWith(claim.metadata, {
          invoiceEmailStatus: "SENT",
          invoiceEmailSentAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    if (!providerAccepted) {
      await prisma.payment.update({
        where: { id: claim.paymentId },
        data: { metadata: metadataWith(claim.metadata, { invoiceEmailStatus: "FAILED" }) },
      });
    }
    throw error;
  }
}
