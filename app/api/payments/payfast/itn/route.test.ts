import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { processPayFastITN } from "@/src/server/services/booking-service";

vi.mock("@/src/server/services/booking-service", () => ({
  getBookingConfirmation: vi.fn(),
  processPayFastITN: vi.fn(),
}));

const processITNMock = vi.mocked(processPayFastITN);

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

    const response = await POST(formRequest("payment_status=COMPLETE&m_payment_id=NOM-1"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(processITNMock).toHaveBeenCalledWith(
      { payment_status: "COMPLETE", m_payment_id: "NOM-1" },
      "payment_status=COMPLETE&m_payment_id=NOM-1",
      null,
    );
  });

  it.each([
    [{ success: true, duplicate: false, latePayment: true }, "late-payment refund transition"],
    [{ success: true, duplicate: true }, "duplicate notification for a refund state"],
  ] as const)("acknowledges a processed %2$s", async (result, description) => {
    expect(description).toMatch(/refund/);
    processITNMock.mockResolvedValue(result);

    const response = await POST(formRequest("payment_status=COMPLETE&m_payment_id=NOM-REFUND"));

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
