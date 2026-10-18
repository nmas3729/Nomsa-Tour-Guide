import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { processPayFastITN } from "@/src/server/services/booking-service";
import { sendApprovedBookingInvoice } from "@/src/server/services/invoice-email-service";

vi.mock("@/src/server/services/booking-service", () => ({
  getBookingConfirmation: vi.fn(),
  processPayFastITN: vi.fn(),
}));
vi.mock("@/src/server/services/invoice-email-service", () => ({
  sendApprovedBookingInvoice: vi.fn(),
}));

const processITNMock = vi.mocked(processPayFastITN);
const sendInvoiceMock = vi.mocked(sendApprovedBookingInvoice);

beforeEach(() => {
  vi.clearAllMocks();
});

function formRequest(body: string, contentType = "application/x-www-form-urlencoded") {
  return new Request("http://localhost/api/payments/payfast/itn", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

describe("POST /api/payments/payfast/itn", () => {
  it("acknowledges a successfully processed provider notification", async () => {
    processITNMock.mockResolvedValue({ success: true, duplicate: false });
    sendInvoiceMock.mockResolvedValue(undefined);

    const response = await POST(formRequest("payment_status=COMPLETE&m_payment_id=NOM-1"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(processITNMock).toHaveBeenCalledWith(
      { payment_status: "COMPLETE", m_payment_id: "NOM-1" },
      "payment_status=COMPLETE&m_payment_id=NOM-1",
      null,
    );
    expect(sendInvoiceMock).toHaveBeenCalledWith("NOM-1");
  });

  it("sends a receipt for a late captured payment that is pending refund", async () => {
    const result = { success: true, duplicate: false, latePayment: true } as const;
    processITNMock.mockResolvedValue(result);
    sendInvoiceMock.mockResolvedValue(undefined);

    const response = await POST(formRequest("payment_status=COMPLETE&m_payment_id=NOM-LATE"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(sendInvoiceMock).toHaveBeenCalledWith("NOM-LATE");
  });

  it("checks receipt delivery again on duplicate completion notifications", async () => {
    processITNMock.mockResolvedValue({ success: true, duplicate: true });
    sendInvoiceMock.mockResolvedValue(undefined);

    const response = await POST(formRequest("payment_status=COMPLETE&m_payment_id=NOM-REFUND"));

    expect(response.status).toBe(200);
    expect(sendInvoiceMock).toHaveBeenCalledWith("NOM-REFUND");
  });

  it("does not send a receipt for failed payments", async () => {
    processITNMock.mockResolvedValue({ success: true, duplicate: false });
    sendInvoiceMock.mockResolvedValue(undefined);

    const response = await POST(formRequest("payment_status=FAILED&m_payment_id=NOM-FAILED"));

    expect(response.status).toBe(200);
    expect(sendInvoiceMock).not.toHaveBeenCalled();
  });

  it("still acknowledges an approved payment if receipt delivery fails", async () => {
    processITNMock.mockResolvedValue({ success: true, duplicate: false });
    sendInvoiceMock.mockRejectedValue(new Error("Resend unavailable"));

    const response = await POST(formRequest("payment_status=COMPLETE&m_payment_id=NOM-1"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  it("rejects non-form payloads before processing", async () => {
    const response = await POST(formRequest("payment_status=COMPLETE", "application/json"));

    expect(response.status).toBe(415);
    expect(processITNMock).not.toHaveBeenCalled();
  });

  it("rejects duplicate fields before processing", async () => {
    const response = await POST(formRequest("payment_status=PENDING&payment_status=COMPLETE"));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Duplicate ITN parameter.");
    expect(processITNMock).not.toHaveBeenCalled();
  });

  it("returns provider-validation failures without acknowledging success", async () => {
    processITNMock.mockResolvedValue({ success: false, reason: "Invalid notification." });

    const response = await POST(formRequest("payment_status=FAILED"));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid notification.");
  });
});
