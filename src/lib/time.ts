export function localTime(timeZone: string, date = new Date()) {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(date);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(date));
  return { time, day, hour };
}

/** Offset from UTC in minutes for a timezone at a given instant. */
export function tzOffsetMinutes(timeZone: string, date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUTC - date.getTime()) / 60000);
}

export function offsetLabel(timeZone: string, date = new Date()): string {
  const m = tzOffsetMinutes(timeZone, date);
  const sign = m >= 0 ? "+" : "−";
  const a = Math.abs(m);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? ":" + String(a % 60).padStart(2, "0") : ""}`;
}

/** Human-readable difference between the viewer's clock and a destination's clock. */
export function diffFromViewer(timeZone: string, date = new Date()): string {
  const diff = tzOffsetMinutes(timeZone, date) + date.getTimezoneOffset();
  if (diff === 0) return "Same time as you";
  const a = Math.abs(diff);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `${h ? h + "h" : ""}${m ? ` ${m}m` : ""} ${diff > 0 ? "ahead of" : "behind"} you`.trim();
}
