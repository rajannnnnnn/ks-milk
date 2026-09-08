import { getBusinessSettings } from "./businessSettings";

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Great-circle distance between two GPS points, in kilometers.
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface RadiusCheckResult {
  allowed: boolean;
  distanceKm: number;
  radiusKm: number;
}

// PRD section 4: exactly the configured radius is allowed; anything greater
// is rejected. GPS coordinates are authoritative — never fall back to PIN code.
export async function checkDeliveryRadius(
  latitude: number,
  longitude: number,
): Promise<RadiusCheckResult> {
  const settings = await getBusinessSettings();
  const distanceKm = haversineDistanceKm(
    settings.businessLatitude,
    settings.businessLongitude,
    latitude,
    longitude,
  );

  // Guard against floating-point noise (e.g. 2.0000000000000004) at the
  // exact-radius boundary by rounding to millimeter precision before compare.
  const rounded = Math.round(distanceKm * 1e6) / 1e6;

  return {
    allowed: rounded <= settings.deliveryRadiusKm,
    distanceKm: rounded,
    radiusKm: settings.deliveryRadiusKm,
  };
}
