import { DateTime } from "luxon";
import { prisma } from "../lib/prisma";
import { getBusinessSettings } from "./businessSettings";
import { isNonDeliveryDay } from "./orderScheduling";
import { getCurrentPrice } from "./pricing";
import { toBusinessDateOnly } from "../lib/businessDate";

// All subscription date fields (startDate, endDate, SubscriptionDelivery.scheduledDate)
// are stored as "business dates" — UTC midnight representing a calendar day,
// not a real instant (see toBusinessDateOnly). All arithmetic below stays in
// the "utc" zone so every DateTime involved shares that same representation;
// only isNonDeliveryDay's weekday/closure lookup cares about the calendar
// Y-M-D, which is preserved regardless of zone.

// Generates SubscriptionDelivery ledger rows for every ACTIVE subscription,
// covering dates from "today" up to `horizonDays` ahead (default 7), so a
// customer always sees near-term upcoming deliveries and jobs can run daily.
// Idempotent: relies on the unique (subscriptionId, scheduledDate) constraint
// — re-running for an already-generated date is a no-op (Rule 9).
export async function generateSubscriptionDeliveries(horizonDays = 7, referenceDate: Date = new Date()): Promise<number> {
  const settings = await getBusinessSettings();
  const todayInBusinessTz = DateTime.fromJSDate(referenceDate, { zone: "utc" }).setZone(settings.timezone).startOf("day");
  const today = DateTime.fromJSDate(toBusinessDateOnly(todayInBusinessTz), { zone: "utc" });

  const subscriptions = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { pauses: true },
  });

  let created = 0;

  for (const sub of subscriptions) {
    const start = DateTime.fromJSDate(sub.startDate, { zone: "utc" }).startOf("day");
    const end = DateTime.fromJSDate(sub.endDate, { zone: "utc" }).startOf("day");
    const windowStart = today > start ? today : start;
    const windowEnd = today.plus({ days: horizonDays });
    const effectiveEnd = windowEnd < end ? windowEnd : end;

    if (effectiveEnd < windowStart) continue;

    const unitPrice = await getCurrentPrice(sub.productId, sub.startDate).catch(() => null);
    if (unitPrice === null) continue;

    let cursor = windowStart;
    while (cursor <= effectiveEnd) {
      const scheduledDate = toBusinessDateOnly(cursor);

      const existing = await prisma.subscriptionDelivery.findUnique({
        where: { subscriptionId_scheduledDate: { subscriptionId: sub.id, scheduledDate } },
      });

      if (!existing) {
        const paused = sub.pauses.some((p) => cursor >= DateTime.fromJSDate(p.startDate, { zone: "utc" }).startOf("day") && cursor <= DateTime.fromJSDate(p.endDate, { zone: "utc" }).startOf("day"));
        const closure = await isNonDeliveryDay(cursor);

        let status: "SCHEDULED" | "PAUSED" | "NOT_DELIVERED" = "SCHEDULED";
        let reason: string | undefined;
        let billable = true;

        if (paused) {
          status = "PAUSED";
          reason = "Customer Paused";
          billable = false;
        } else if (closure.closed) {
          status = "NOT_DELIVERED";
          reason = closure.reason;
          billable = false;
        }

        await prisma.subscriptionDelivery.create({
          data: {
            subscriptionId: sub.id,
            scheduledDate,
            productId: sub.productId,
            quantity: sub.quantity,
            unitPrice,
            status,
            reason,
            billable,
          },
        });
        created += 1;
      }

      cursor = cursor.plus({ days: 1 });
    }
  }

  return created;
}

// Expires subscriptions whose end date has passed. Idempotent — updating an
// already-expired subscription again is a harmless no-op.
export async function expireSubscriptions(referenceDate: Date = new Date()): Promise<number> {
  const result = await prisma.subscription.updateMany({
    where: { status: "ACTIVE", endDate: { lt: referenceDate } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
