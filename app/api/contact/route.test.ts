import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { sendContactMessage } = vi.hoisted(() => ({
  sendContactMessage: vi.fn(),
}));

vi.mock("@/src/server/services/contact-email-service", () => ({
  sendContactMessage,
}));

const payload = {
  name: "A Traveller",
  email: "traveller@example.com",
  subject: "Planning a journey",
  message: "I would like help planning a trip.",
};

function createRequest(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("sends a validated same-origin contact message", async () => {
    sendContactMessage.mockResolvedValue(undefined);

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(sendContactMessage).toHaveBeenCalledWith(payload);
  });

  it("rejects invalid form data without sending email", async () => {
    const response = await POST(createRequest({ ...payload, email: "not-an-email" }));

    expect(response.status).toBe(400);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(createRequest(payload, "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it("returns a calm service error if delivery fails", async () => {
    sendContactMessage.mockRejectedValue(new Error("Provider unavailable"));

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Your message could not be sent. Please try again shortly.",
    });
  });
});
