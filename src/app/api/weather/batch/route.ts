import { PLACES } from "@/data/places";
import { cached, json, UA } from "@/lib/server";
import type { CurrentWeather } from "@/lib/types";

const TTL = 30 * 60;

/** Current weather for every place on the globe, in ONE upstream request (Open-Meteo multi-location). */
export async function GET() {
  try {
    const data = await cached("weather:batch", TTL, async () => {
      const lat = PLACES.map((p) => p.lat.toFixed(3)).join(",");
      const lng = PLACES.map((p) => p.lng.toFixed(3)).join(",");
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=GMT`;
      const res = await fetch(url, { headers: { "user-agent": UA }, next: { revalidate: TTL } });
      if (!res.ok) throw new Error(`open-meteo ${res.status}`);
      const body = await res.json();
      const arr = Array.isArray(body) ? body : [body];
      const out: Record<string, CurrentWeather> = {};
      arr.forEach((loc, i) => {
        const c = loc?.current;
        if (!c) return;
        out[PLACES[i].id] = {
          temperature: c.temperature_2m,
          weatherCode: c.weather_code,
          windSpeed: c.wind_speed_10m,
          isDay: c.is_day === 1,
        };
      });
      return out;
    });
    return json(data, TTL);
  } catch (e) {
    return json({ error: String(e) }, 60, 502);
  }
}
