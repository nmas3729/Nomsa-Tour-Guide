import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate } from "./format";

describe("formatCurrency", () => {
  it("formats a South African Rand amount", () => {
    expect(formatCurrency(1250, "ZAR", "en-ZA")).toContain("1");
    expect(formatCurrency(1250, "ZAR", "en-ZA")).toContain("250");
  });

  it("rejects values that cannot represent an amount", () => {
    expect(() => formatCurrency(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatDate", () => {
  it("formats stored date-only values without shifting the calendar day", () => {
    expect(formatDate("2026-12-12", { dateStyle: "medium", timeZone: "UTC" }, "en-ZA")).toContain("12");
  });

  it("rejects invalid dates", () => {
    expect(() => formatDate("not-a-date")).toThrow(RangeError);
  });
});
