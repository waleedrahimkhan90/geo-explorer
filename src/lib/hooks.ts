"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/** Minimal JSON fetch hook with in-memory de-duplication across components. */
const cache = new Map<string, Promise<unknown>>();
export function useJson<T>(url: string | null) {
  const [state, setState] = useState<{ url: string | null; data?: T; error?: string }>({ url: null });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    let p = cache.get(url) as Promise<T> | undefined;
    if (!p) {
      p = fetch(url).then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? `HTTP ${r.status}`);
        return r.json();
      });
      cache.set(url, p);
      p.catch(() => cache.delete(url));
    }
    p.then(
      (data) => alive && setState({ url, data }),
      (e) => alive && setState({ url, error: String(e?.message ?? e) }),
    );
    return () => {
      alive = false;
    };
  }, [url]);
  const fresh = state.url === url;
  return { data: fresh ? state.data : undefined, error: fresh ? state.error : undefined, loading: !!url && !fresh };
}

/** Ticks every `ms` so clocks stay live. */
export function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** localStorage-backed state shared between components (saved places, recents). */
const listeners = new Set<() => void>();
const memo = new Map<string, { raw: string | null; value: unknown }>();
function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {}
  const m = memo.get(key);
  if (m && m.raw === raw) return m.value as T;
  let value: T = fallback;
  try {
    value = raw ? (JSON.parse(raw) as T) : fallback;
  } catch {}
  memo.set(key, { raw, value });
  return value;
}
export function useStored<T>(key: string, fallback: T) {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    window.addEventListener("storage", cb);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", cb);
    };
  }, []);
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = read(key, fallback);
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {}
      listeners.forEach((l) => l());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, set] as const;
}

/**
 * Best photo for a place: its own Wikipedia lead image, or (when that is a flag/map and was
 * filtered out during sync) the photo of its first attraction that has one.
 */
export function usePlaceImage(place: { wiki: string; attractions: string[] }) {
  type W = import("./types").WikiSummary;
  const main = useJson<W>(`/api/wiki?title=${encodeURIComponent(place.wiki)}`);
  const needFallback = !!main.data && !main.data.image;
  const a0 = useJson<W>(needFallback && place.attractions[0] ? `/api/wiki?title=${encodeURIComponent(place.attractions[0])}` : null);
  const a1 = useJson<W>(needFallback && place.attractions[1] ? `/api/wiki?title=${encodeURIComponent(place.attractions[1])}` : null);
  if (main.data?.image) return { image: main.data.image, from: null as string | null, loading: false };
  const alt = [a0.data, a1.data].find((d) => d?.image);
  if (alt?.image) return { image: alt.image, from: alt.title, loading: false };
  return { image: undefined, from: null, loading: main.loading || a0.loading || a1.loading };
}
