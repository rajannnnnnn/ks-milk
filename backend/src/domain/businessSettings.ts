import { prisma } from "../lib/prisma";
import { env } from "../config/env";

// Central, admin-configurable business rules (PRD section 32 / Rule 4).
// Nothing else in the codebase should hard-code these values.
export interface BusinessSettings {
  deliveryRadiusKm: number;
  businessLatitude: number;
  businessLongitude: number;
  timezone: string;
  sameDayOrderCutoff: string; // "HH:mm", 24h, in `timezone`
  deliveryStartTime: string; // "HH:mm"
  deliveryEndTime: string; // "HH:mm"
  skipDeadlineTime: string; // "HH:mm" on the previous day
  subscriptionBilling: "POSTPAID";
  subscriptionFrequencyDefault: "DAILY";
}

const DEFAULTS: BusinessSettings = {
  deliveryRadiusKm: 2,
  businessLatitude: env.BUSINESS_LAT,
  businessLongitude: env.BUSINESS_LNG,
  timezone: env.BUSINESS_TIMEZONE,
  sameDayOrderCutoff: "18:00",
  deliveryStartTime: "18:00",
  deliveryEndTime: "21:00",
  skipDeadlineTime: "21:00",
  subscriptionBilling: "POSTPAID",
  subscriptionFrequencyDefault: "DAILY",
};

const KEY = "business_settings";

let cache: BusinessSettings | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cache;
  }

  const row = await prisma.businessSetting.findUnique({ where: { key: KEY } });
  const settings: BusinessSettings = row
    ? { ...DEFAULTS, ...(row.value as Partial<BusinessSettings>) }
    : DEFAULTS;

  cache = settings;
  cacheLoadedAt = now;
  return settings;
}

export async function updateBusinessSettings(
  patch: Partial<BusinessSettings>,
): Promise<BusinessSettings> {
  const current = await getBusinessSettings();
  const next = { ...current, ...patch };

  await prisma.businessSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: next },
    update: { value: next },
  });

  cache = next;
  cacheLoadedAt = Date.now();
  return next;
}

export function invalidateBusinessSettingsCache(): void {
  cache = null;
}
