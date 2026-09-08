import { describe, it, expect } from "vitest";
import { calculateSubscriptionEndDate } from "../domain/subscriptionPlan";

describe("calculateSubscriptionEndDate", () => {
  it("monthly: 15 Aug -> 14 Sep", () => {
    const end = calculateSubscriptionEndDate(new Date(Date.UTC(2025, 7, 15)), "MONTHLY");
    expect(end.toISOString().slice(0, 10)).toBe("2025-09-14");
  });

  it("quarterly: 15 Aug -> 14 Nov", () => {
    const end = calculateSubscriptionEndDate(new Date(Date.UTC(2025, 7, 15)), "QUARTERLY");
    expect(end.toISOString().slice(0, 10)).toBe("2025-11-14");
  });

  it("yearly: 15 Aug -> 14 Aug next year", () => {
    const end = calculateSubscriptionEndDate(new Date(Date.UTC(2025, 7, 15)), "YEARLY");
    expect(end.toISOString().slice(0, 10)).toBe("2026-08-14");
  });

  it("handles month-end start dates (31 Jan monthly -> end of Feb window)", () => {
    const end = calculateSubscriptionEndDate(new Date(Date.UTC(2025, 0, 31)), "MONTHLY");
    // Luxon clamps 31 Jan + 1 month to the last valid day of Feb, minus 1 day.
    expect(end.getUTCMonth()).toBe(1); // February
  });
});
