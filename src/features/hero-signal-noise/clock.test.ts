import { describe, it, expect } from "vitest";
import { formatTimeOfDay, formatUtcDate, PLACEHOLDER_TIME, PLACEHOLDER_DATE } from "./clock";

describe("clock formatters", () => {
  it("formats local 24-hour HH:MM:SS with leading zeros", () => {
    const d = new Date("2026-04-27T03:05:09.000Z");
    // Avoid TZ flake: use a UTC-fixed Date and call the formatter directly.
    expect(formatTimeOfDay(d, "UTC")).toBe("03:05:09");
  });

  it("formats UTC date as YYYY/MM/DD", () => {
    const d = new Date("2026-04-27T12:00:00.000Z");
    expect(formatUtcDate(d)).toBe("2026/04/27");
  });

  it("handles year boundaries", () => {
    const d = new Date("2025-12-31T23:59:59.000Z");
    expect(formatUtcDate(d)).toBe("2025/12/31");
    expect(formatTimeOfDay(d, "UTC")).toBe("23:59:59");
  });

  it("exposes placeholder constants for pre-mount paint", () => {
    expect(PLACEHOLDER_TIME).toBe("--:--:--");
    expect(PLACEHOLDER_DATE).toBe("----/--/--");
  });
});
