import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireGuideApplicationEmailEnvironment } from "@/src/config/env";
import { sendGuideApplicationReviewEmail } from "./guide-application-email";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/src/config/env", () => ({
  requireGuideApplicationEmailEnvironment: vi.fn(),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const guideEnvironmentMock = vi.mocked(requireGuideApplicationEmailEnvironment);

const application = {
  role: "GUIDE" as const,
  name: "Nomsa Applicant",
  email: "nomsa@example.com",
  password: "Not included in the email",
  confirmPassword: "Not included in the email",
  phone: "+27 66 123 4567",
  biography: "I have guided visitors through my home region for many years.",
  yearsExperience: 8,
  emergencyContactName: "Emergency Person",
  emergencyContactPhone: "+27 82 123 4567",
  businessName: "Local Journeys",
  businessRegistration: "REG-123",
  specialties: "Heritage, food",
  languages: "English, isiXhosa",
  operatingAreas: "Cape Town",
};

describe("guide application review email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guideEnvironmentMock.mockReturnValue({
      RESEND_API_KEY: "resend-test-key",
      GUIDE_APPLICATION_FROM_EMAIL: "applications@example.com",
      GUIDE_APPLICATION_TO_EMAIL: "guides@nomsatourguides.co.za",
    });
    sendMock.mockResolvedValue({ data: { id: "message-id" }, error: null });
  });

  it("sends application details to the dedicated inbox from the configured sender", async () => {
    await sendGuideApplicationReviewEmail(application);

    expect(sendMock).toHaveBeenCalledWith({
      from: "applications@example.com",
      to: "guides@nomsatourguides.co.za",
      replyTo: "nomsa@example.com",
      subject: "Guide application for review: Nomsa Applicant",
      text: expect.stringContaining("Application status: PENDING"),
    });
    const emailText = sendMock.mock.calls[0][0].text as string;
    expect(emailText).toContain("Biography:");
    expect(emailText).toContain(application.biography);
    expect(emailText).not.toContain(application.password);
    expect(emailText).not.toContain(application.emergencyContactPhone);
    expect(emailText).toContain("Review and any approval or publication decision must be made manually.");
  });

  it("surfaces provider delivery failures to the caller", async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: "ResendError" } });

    await expect(sendGuideApplicationReviewEmail(application)).rejects.toThrow(
      "Guide application review email failed: ResendError",
    );
  });
});
