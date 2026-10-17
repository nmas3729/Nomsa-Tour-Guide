import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentStatus } from "@/src/server/db/generated/enums";
import { getPrismaClient } from "@/src/server/db/prisma";
import { requireBillingEmailEnvironment } from "@/src/config/env";
import { sendApprovedBookingInvoice } from "./invoice-email-service";

const { sendMock, toSummaryMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  toSummaryMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/config/env", () => ({
  requireBillingEmailEnvironment: vi.fn(),
}));
vi.mock("@/src/server/db/prisma", () => ({
  getPrismaClient: vi.fn(),
}));
vi.mock("@/src/server/services/booking-service", () => ({
  bookingInclude: {},
  toBookingRecordSummary: toSummaryMock,
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const prismaMock = vi.mocked(getPrismaClient);
const billingEnvironmentMock = vi.mocked(requireBillingEmailEnvironment);

const summary = {
  id: "booking-id",
  reference: "NOM-ABC123",
  experienceTitle: "Bo-Kaap local walk",
  experienceSlug: "bo-kaap-local-walk",
  guideName: "Thandi Mokoena",
  destination: "Cape Town, Western Cape",
  date: "2026-12-12",
  timeSlot: "09:00 AM",
  travellerCount: 2,
  adultsCount: 2,
  childrenCount: 0,
  leadEmail: "alex@example.com",
  leadName: "Alex Traveller",
  totalPrice: 2400,
  currency: "ZAR",
  status: "CONFIRMED",
  paymentStatus: "SUCCEEDED",
  paidAt: "2026-10-17T08:12:00.000Z",
  invoiceEmailStatus: null,
  meetingPoint: "Cape Town",
  createdAt: "2026-10-17T08:12:00.000Z",
} as const;

let payment: {
  id: string;
  status: string;
  paidAt: Date | null;
  metadata: Record<string, unknown> | null;
  booking: { status: string; paymentStatus: string };
};
let updatePaymentMock: ReturnType<typeof vi.fn>;
let prisma: {
  $transaction: ReturnType<typeof vi.fn>;
  payment: { update: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  payment = {
    id: "payment-id",
    status: PaymentStatus.SUCCEEDED,
    paidAt: new Date("2026-10-17T08:12:00.000Z"),
    metadata: { emergencyContact: "Persisted detail" },
    booking: { status: "CONFIRMED", paymentStatus: PaymentStatus.SUCCEEDED },
  };
  updatePaymentMock = vi.fn().mockResolvedValue(undefined);
  const transaction = {
    payment: {
      findUnique: vi.fn().mockImplementation(async () => payment),
      update: vi.fn().mockImplementation(async ({ data }) => {
        payment.metadata = data.metadata;
        return payment;
      }),
    },
  };
  prisma = {
    $transaction: vi.fn().mockImplementation(async (callback) => callback(transaction)),
    payment: { update: updatePaymentMock },
  };
  prismaMock.mockReturnValue(prisma as never);
  billingEnvironmentMock.mockReturnValue({
    RESEND_API_KEY: "resend-test-key",
    BILLING_FROM_EMAIL: "billing@nomsatourguides.co.za",
  } as ReturnType<typeof requireBillingEmailEnvironment>);
  toSummaryMock.mockReturnValue(summary);
  sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
});

describe("approved booking invoice email", () => {
  it("sends one attached PDF from the configured billing sender after approval", async () => {
    await sendApprovedBookingInvoice("NOM-ABC123");

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "billing@nomsatourguides.co.za",
        to: "alex@example.com",
        subject: "Invoice for booking NOM-ABC123",
        text: expect.stringContaining("Payment status: SUCCEEDED"),
        attachments: [expect.objectContaining({
          filename: "invoice-NOM-ABC123.pdf",
          content: expect.any(String),
        })],
      }),
      { idempotencyKey: "booking-invoice-payment-id" },
    );
    expect(updatePaymentMock).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        metadata: expect.objectContaining({
          emergencyContact: "Persisted detail",
          invoiceEmailStatus: "SENT",
        }),
      },
    }));
  });

  it("does not email or create an invoice for an unpaid booking", async () => {
    payment.status = PaymentStatus.FAILED;
    payment.booking.status = "CANCELLED";
    payment.booking.paymentStatus = PaymentStatus.FAILED;

    await sendApprovedBookingInvoice("NOM-ABC123");

    expect(sendMock).not.toHaveBeenCalled();
    expect(updatePaymentMock).not.toHaveBeenCalled();
  });

  it("does not resend an invoice already marked as delivered", async () => {
    payment.metadata = {
      emergencyContact: "Persisted detail",
      invoiceEmailStatus: "SENT",
    };

    await sendApprovedBookingInvoice("NOM-ABC123");

    expect(sendMock).not.toHaveBeenCalled();
    expect(updatePaymentMock).not.toHaveBeenCalled();
  });

  it("records a failed delivery without losing existing payment metadata", async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: "ResendError" } });

    await expect(sendApprovedBookingInvoice("NOM-ABC123")).rejects.toThrow(
      "Resend invoice email failed: ResendError",
    );

    expect(updatePaymentMock).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        metadata: expect.objectContaining({
          emergencyContact: "Persisted detail",
          invoiceEmailStatus: "FAILED",
        }),
      },
    }));
  });
});
