import { describe, it, expect, beforeEach, vi } from "vitest";

// businessSettings hits the DB; mock it so this stays a pure unit test of
// the cutoff/window boundary math against fixed settings.
vi.mock("../domain/businessSettings", () => ({
  getBusinessSettings: vi.fn(async () => ({
    deliveryRadiusKm: 2,
    businessLatitude: 12.9716,
    businessLongitude: 77.5946,
    timezone: "Asia/Kolkata",
    sameDayOrderCutoff: "18:00",
    deliveryStartTime: "18:00",
    deliveryEndTime: "21:00",
    skipDeadlineTime: "21:00",
    subscriptionBilling: "POSTPAID",
    subscriptionFrequencyDefault: "DAILY",
  })),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    weeklyNonDeliveryDay: { findMany: vi.fn(async () => []) },
    businessClosure: { findUnique: vi.fn(async () => null) },
  },
}));

import { calculateOrderSchedule, isSkipAllowed } from "../domain/orderScheduling";

// IST is UTC+5:30. 18:00 IST == 12:30 UTC.
function istAsUtc(dateUtcDay: string, hourIst: number, minuteIst: number): Date {
  const totalMinutesUtc = hourIst * 60 + minuteIst - (5 * 60 + 30);
  const base = new Date(`${dateUtcDay}T00:00:00.000Z`);
  return new Date(base.getTime() + totalMinutesUtc * 60_000);
}

describe("calculateOrderSchedule cutoff boundary", () => {
  const day = "2025-08-15"; // a Friday, no closures mocked

  it("17:59 IST schedules for today", async () => {
    const result = await calculateOrderSchedule(istAsUtc(day, 17, 59));
    expect(result.scheduledDate.toISOString().slice(0, 10)).toBe("2025-08-15");
  });

  it("exactly 18:00 IST schedules for the next day", async () => {
    const result = await calculateOrderSchedule(istAsUtc(day, 18, 0));
    expect(result.scheduledDate.toISOString().slice(0, 10)).toBe("2025-08-16");
  });

  it("18:01 IST schedules for the next day", async () => {
    const result = await calculateOrderSchedule(istAsUtc(day, 18, 1));
    expect(result.scheduledDate.toISOString().slice(0, 10)).toBe("2025-08-16");
  });

  it("23:59 IST schedules for the next day", async () => {
    const result = await calculateOrderSchedule(istAsUtc(day, 23, 59));
    expect(result.scheduledDate.toISOString().slice(0, 10)).toBe("2025-08-16");
  });
});

describe("isSkipAllowed deadline boundary (9 PM previous day)", () => {
  const deliveryDay = "2025-08-16";
  const scheduledDate = new Date(`${deliveryDay}T00:00:00.000Z`);

  it("8:59 PM the previous day is allowed", async () => {
    expect(await isSkipAllowed(scheduledDate, istAsUtc("2025-08-15", 20, 59))).toBe(true);
  });

  it("exactly 9:00 PM the previous day is too late", async () => {
    expect(await isSkipAllowed(scheduledDate, istAsUtc("2025-08-15", 21, 0))).toBe(false);
  });
});
