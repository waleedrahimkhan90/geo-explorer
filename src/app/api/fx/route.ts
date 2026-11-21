import { cached, json, UA } from "@/lib/server";

const TTL = 12 * 60 * 60;

/**
 * Exchange rate base -> target. Frankfurter (ECB data) first; it covers ~30 major
 * currencies, so we fall back to open.er-api.com for the rest (attribution required).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = (searchParams.get("from") ?? "USD").toUpperCase();
  const to = (searchParams.get("to") ?? "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return json({ error: "invalid currency" }, 60, 400);
  if (from === to) return json({ from, to, rate: 1, source: "identity" }, TTL);

  try {
    const data = await cached(`fx:${from}:${to}`, TTL, async () => {
      const f = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`, {
        headers: { "user-agent": UA },
        next: { revalidate: TTL },
      });
      if (f.ok) {
        const b = await f.json();
        if (b?.rates?.[to]) return { from, to, rate: b.rates[to] as number, date: b.date, source: "Frankfurter (ECB)" };
      }
      const e = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
        headers: { "user-agent": UA },
        next: { revalidate: TTL },
      });
      if (!e.ok) throw new Error(`fx ${e.status}`);
      const b = await e.json();
      const rate = b?.rates?.[to];
      if (!rate) throw new Error("rate unavailable");
      return { from, to, rate: rate as number, date: b.time_last_update_utc, source: "ExchangeRate-API" };
    });
    return json(data, TTL);
  } catch (e) {
    return json({ error: String(e) }, 300, 502);
  }
}
