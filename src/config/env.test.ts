import { afterEach, describe, expect, it, vi } from "vitest";
import { getPayoutEnvironment, getServerEnvironment } from "./env";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("payout environment isolation", () => {
  it("does not make general server configuration fail when payout settings are missing or malformed", () => {
    vi.stubEnv("NOMSA_PLATFORM_COMMISSION_RATE", "invalid");
    vi.stubEnv("PAYOUT_DISPUTE_WINDOW_DAYS", "0");

    expect(() => getServerEnvironment()).not.toThrow();
    expect(getPayoutEnvironment()).toEqual({
      NOMSA_PLATFORM_COMMISSION_RATE: "invalid",
      PAYOUT_DISPUTE_WINDOW_DAYS: "0",
    });
  });

  it("returns missing payout settings as unavailable for payout-specific validation", () => {
    vi.stubEnv("NOMSA_PLATFORM_COMMISSION_RATE", "");
    vi.stubEnv("PAYOUT_DISPUTE_WINDOW_DAYS", "");

    expect(() => getServerEnvironment()).not.toThrow();
    expect(getPayoutEnvironment()).toEqual({
      NOMSA_PLATFORM_COMMISSION_RATE: undefined,
      PAYOUT_DISPUTE_WINDOW_DAYS: undefined,
    });
  });
});
