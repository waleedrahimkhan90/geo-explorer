import type { Place } from "./types";

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearby(place: Place, all: Place[], maxKm = 1500, limit = 6) {
  return all
    .filter((p) => p.id !== place.id)
    .map((p) => ({ place: p, km: distanceKm(place, p) }))
    .filter((x) => x.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/** Approximate sub-solar point (where the sun is directly overhead) for a date. */
export function sunPosition(date = new Date()): { lat: number; lng: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 864e5;
  const g = ((2 * Math.PI) / 365.25) * (dayOfYear - 1);
  // Declination (Spencer approximation, degrees)
  const decl =
    (0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
      0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)) * (180 / Math.PI);
  // Equation of time (minutes)
  const eot =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  let lng = -((utcMinutes + eot) / 4 - 180);
  lng = ((lng + 540) % 360) - 180;
  return { lat: decl, lng };
}
