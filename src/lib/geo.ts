import type { LngLat } from "@/lib/countries";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function scoreFromDistanceKm(distanceKm: number): number {
  // GeoGuessr-ish feel: steep falloff but still rewarding.
  // Max 5000, ~1830 at 200km, ~670 at 400km.
  const raw = 5000 * Math.exp(-distanceKm / 200);
  return Math.max(0, Math.round(raw));
}
