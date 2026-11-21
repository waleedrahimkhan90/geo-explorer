import { cached, json, UA } from "@/lib/server";
import type { Forecast } from "@/lib/types";

const TTL = 15 * 60;

/** Current conditions + 7-day forecast for one location. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return json({ error: "invalid lat/lng" }, 60, 400);
  }
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  try {
    const data = await cached<Forecast>(`weather:${key}`, TTL, async () => {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=auto&forecast_days=7`;
      const res = await fetch(url, { headers: { "user-agent": UA }, next: { revalidate: TTL } });
      if (!res.ok) throw new Error(`open-meteo ${res.status}`);
      const b = await res.json();
      return {
        current: {
          temperature: b.current.temperature_2m,
          apparent: b.current.apparent_temperature,
          humidity: b.current.relative_humidity_2m,
          weatherCode: b.current.weather_code,
          windSpeed: b.current.wind_speed_10m,
          isDay: b.current.is_day === 1,
        },
        daily: (b.daily.time as string[]).map((date, i) => ({
          date,
          max: b.daily.temperature_2m_max[i],
          min: b.daily.temperature_2m_min[i],
          weatherCode: b.daily.weather_code[i],
          precipProb: b.daily.precipitation_probability_max?.[i] ?? null,
        })),
      };
    });
    return json(data, TTL);
  } catch (e) {
    return json({ error: String(e) }, 60, 502);
  }
}
