import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireGuideApplicationEmailEnvironment } from "@/src/config/env";
import { GuideApplicationStatus } from "@/src/server/db/generated/enums";
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
  name: "Nomsa Applicant",
  email: "nomsa@example.com",
  phone: "+27 66 123 4567",
  applicationId: "application-id",
  serviceTitle: "Bo-Kaap heritage walk",
  status: GuideApplicationStatus.SUBMITTED,
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
      text: expect.stringContaining("Application status: SUBMITTED"),
    });
    const emailText = sendMock.mock.calls[0][0].text as string;
    expect(emailText).toContain(application.serviceTitle);
    expect(emailText).toContain("protected documents in the admin dashboard");
    expect(emailText).not.toContain("applicationId");
  });

  it("surfaces provider delivery failures to the caller", async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: "ResendError" } });

    await expect(sendGuideApplicationReviewEmail(application)).rejects.toThrow(
      "Guide application review email failed: ResendError",
    );
  });
});
