/** WMO weather interpretation codes (used by Open-Meteo). */
const CODES: Record<number, [string, string]> = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫"],
  48: ["Rime fog", "🌫"],
  51: ["Light drizzle", "🌦"],
  53: ["Drizzle", "🌦"],
  55: ["Dense drizzle", "🌧"],
  56: ["Freezing drizzle", "🌧"],
  57: ["Freezing drizzle", "🌧"],
  61: ["Light rain", "🌦"],
  63: ["Rain", "🌧"],
  65: ["Heavy rain", "🌧"],
  66: ["Freezing rain", "🌧"],
  67: ["Freezing rain", "🌧"],
  71: ["Light snow", "🌨"],
  73: ["Snow", "🌨"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨"],
  80: ["Rain showers", "🌦"],
  81: ["Rain showers", "🌧"],
  82: ["Violent showers", "⛈"],
  85: ["Snow showers", "🌨"],
  86: ["Snow showers", "❄️"],
  95: ["Thunderstorm", "⛈"],
  96: ["Thunderstorm, hail", "⛈"],
  99: ["Thunderstorm, hail", "⛈"],
};

export function describeWeather(code: number, isDay = true): { label: string; icon: string } {
  const [label, icon] = CODES[code] ?? ["Unknown", "🌡"];
  if (!isDay && (code === 0 || code === 1)) return { label, icon: "🌙" };
  return { label, icon };
}

export const isSnowy = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86;
export const isRainy = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
export const isClearish = (code: number) => code <= 3;

/** Temperature → colour on a cool-to-hot ramp (used by the weather layer). */
export function tempColor(t: number): string {
  const stops: [number, [number, number, number]][] = [
    [-20, [129, 140, 248]],
    [0, [56, 189, 248]],
    [12, [52, 211, 153]],
    [22, [250, 204, 21]],
    [30, [251, 146, 60]],
    [38, [239, 68, 68]],
  ];
  if (t <= stops[0][0]) return `rgb(${stops[0][1].join(",")})`;
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i];
    const [t0, c0] = stops[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      const c = c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
      return `rgb(${c.join(",")})`;
    }
  }
  return `rgb(${stops[stops.length - 1][1].join(",")})`;
}
