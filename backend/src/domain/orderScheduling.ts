import { DateTime } from "luxon";
import { prisma } from "../lib/prisma";
import { getBusinessSettings } from "./businessSettings";
import { toBusinessDateOnly } from "../lib/businessDate";

function parseHHmm(value: string): { hour: number; minute: number } {
  const parts = value.split(":").map(Number);
  return { hour: parts[0] ?? 0, minute: parts[1] ?? 0 };
}

// True if `dt` (a Luxon DateTime already in the business timezone) falls on
// a weekly recurring non-delivery day or a specific closed date.
export async function isNonDeliveryDay(dt: DateTime): Promise<{ closed: boolean; reason?: string }> {
  const weeklyClosures = await prisma.weeklyNonDeliveryDay.findMany();
  // Luxon weekday: 1 = Monday .. 7 = Sunday. Our schema uses 0 = Sunday .. 6 = Saturday.
  const dayOfWeek = dt.weekday % 7;
  if (weeklyClosures.some((c) => c.dayOfWeek === dayOfWeek)) {
    return { closed: true, reason: "Business Closed / Non-delivery Day" };
  }

  const dateOnly = toBusinessDateOnly(dt.startOf("day"));
  const specificClosure = await prisma.businessClosure.findUnique({ where: { date: dateOnly } });
  if (specificClosure) {
    return { closed: true, reason: specificClosure.reason ?? "Business Closed / Non-delivery Day" };
  }

  return { closed: false };
}

async function nextDeliverableDay(dt: DateTime): Promise<DateTime> {
  let candidate = dt.startOf("day");
  // Bounded loop: never delivers on a closed day, advances at least one day
  // at a time so it always terminates for any finite closure calendar.
  for (let i = 0; i < 366; i++) {
    const { closed } = await isNonDeliveryDay(candidate);
    if (!closed) return candidate;
    candidate = candidate.plus({ days: 1 });
  }
  throw new Error("No deliverable day found within one year — check business closure configuration");
}

export interface ScheduledDelivery {
  scheduledDate: Date;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
}

// PRD section 9: same-day cutoff (default 18:00 IST). Before cutoff -> today
// (if deliverable), at/after cutoff -> next deliverable day. Orders placed
// on/after cutoff, or on a non-delivery day, roll to the next deliverable day.
export async function calculateOrderSchedule(placedAt: Date = new Date()): Promise<ScheduledDelivery> {
  const settings = await getBusinessSettings();
  const now = DateTime.fromJSDate(placedAt, { zone: "utc" }).setZone(settings.timezone);
  const cutoff = parseHHmm(settings.sameDayOrderCutoff);
  const cutoffToday = now.set({ hour: cutoff.hour, minute: cutoff.minute, second: 0, millisecond: 0 });

  const candidate = now < cutoffToday ? now.startOf("day") : now.startOf("day").plus({ days: 1 });
  const target = await nextDeliverableDay(candidate);

  return {
    scheduledDate: toBusinessDateOnly(target),
    deliveryWindowStart: settings.deliveryStartTime,
    deliveryWindowEnd: settings.deliveryEndTime,
  };
}

// A stored "business date" is UTC midnight representing a calendar day, not
// a real instant (see toBusinessDateOnly) — so it must be re-anchored into
// the business timezone by Y-M-D, never by naive setZone (which would shift
// it by the zone offset).
function businessDateToZonedStartOfDay(date: Date, timezone: string): DateTime {
  const utc = DateTime.fromJSDate(date, { zone: "utc" });
  return DateTime.fromObject({ year: utc.year, month: utc.month, day: utc.day }, { zone: timezone });
}

// PRD section 16: skip deadline is a configurable time (default 21:00) on the
// day before the scheduled delivery date.
export async function isSkipAllowed(scheduledDate: Date, now: Date = new Date()): Promise<boolean> {
  const settings = await getBusinessSettings();
  const scheduled = businessDateToZonedStartOfDay(scheduledDate, settings.timezone);
  const deadlineTime = parseHHmm(settings.skipDeadlineTime);
  const deadline = scheduled
    .minus({ days: 1 })
    .set({ hour: deadlineTime.hour, minute: deadlineTime.minute, second: 0, millisecond: 0 });

  const nowInTz = DateTime.fromJSDate(now, { zone: "utc" }).setZone(settings.timezone);
  return nowInTz < deadline;
}

export { nextDeliverableDay };
