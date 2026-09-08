import { DateTime } from "luxon";

// A "business day" (e.g. a scheduled delivery date) is a calendar date in
// the business timezone, not a specific instant. If we naively store the
// real UTC instant for "midnight IST", it lands on the *previous* UTC
// calendar day (IST is UTC+5:30), so any code that later reads the stored
// DateTime and takes its UTC calendar date (toISOString().slice(0,10), or
// a `new Date()`-based "today" range query) sees the wrong day.
//
// To avoid that class of bug, every "business day" DateTime computed in the
// business timezone is normalized to UTC midnight of the same Y-M-D before
// it is turned into a JS Date for storage. This makes the stored value a
// pure calendar date, safe to compare/read regardless of reader timezone.
export function toBusinessDateOnly(dt: DateTime): Date {
  return new Date(Date.UTC(dt.year, dt.month - 1, dt.day));
}
