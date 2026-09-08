import { describe, it, expect } from "vitest";
import { haversineDistanceKm } from "../domain/deliveryRadius";

// Offset a coordinate north by `km` kilometers (good enough for small distances in tests).
function offsetNorth(lat: number, lng: number, km: number) {
  const kmPerDegree = 111.32;
  return { lat: lat + km / kmPerDegree, lng };
}

describe("haversineDistanceKm", () => {
  const origin = { lat: 12.9716, lng: 77.5946 };

  it("returns ~0 for the same point", () => {
    expect(haversineDistanceKm(origin.lat, origin.lng, origin.lat, origin.lng)).toBeCloseTo(0, 3);
  });

  it("returns ~2km for a point offset by 2km", () => {
    const point = offsetNorth(origin.lat, origin.lng, 2);
    const distance = haversineDistanceKm(origin.lat, origin.lng, point.lat, point.lng);
    expect(distance).toBeCloseTo(2, 1);
  });

  it("is symmetric", () => {
    const point = offsetNorth(origin.lat, origin.lng, 1.5);
    const a = haversineDistanceKm(origin.lat, origin.lng, point.lat, point.lng);
    const b = haversineDistanceKm(point.lat, point.lng, origin.lat, origin.lng);
    expect(a).toBeCloseTo(b, 10);
  });
});
