import { DateTime } from "luxon";
import { SubscriptionPlan } from "@prisma/client";

// PRD section 12: subscription end date = start date + plan duration - 1 day
// (inclusive end date), NOT snapped to calendar month boundaries.
// 15 Aug (monthly) -> 14 Sep. 15 Aug (quarterly) -> 14 Nov. 15 Aug (yearly) -> 14 Aug next year.
export function calculateSubscriptionEndDate(startDate: Date, plan: SubscriptionPlan): Date {
  const start = DateTime.fromJSDate(startDate, { zone: "utc" }).startOf("day");
  const monthsToAdd = plan === "MONTHLY" ? 1 : plan === "QUARTERLY" ? 3 : 12;
  return start.plus({ months: monthsToAdd }).minus({ days: 1 }).toJSDate();
}
