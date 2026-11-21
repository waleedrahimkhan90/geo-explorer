"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PLACES } from "@/data/places";
import { COUNTRIES, flagEmoji } from "@/data/countries";

type Result =
  | { type: "place"; id: string; label: string; sub: string; code: string }
  | { type: "country"; name: string; label: string; sub: string; code: string };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Search runs entirely on local data: no geocoding API calls per keystroke. */
export default function SearchBox({
  onPlace,
  onCountry,
}: {
  onPlace: (id: string) => void;
  onCountry: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Press "/" anywhere to jump to search (only the visible instance responds).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = inputRef.current;
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
      if (e.key === "/" && !typing && el && el.offsetParent !== null) {
        e.preventDefault();
        el.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo<Result[]>(() => {
    const n = norm(q.trim());
    if (!n) return [];
    const places: Result[] = PLACES.filter(
      (p) => norm(p.name).includes(n) || norm(p.country).includes(n) || p.categories.some((c) => c.startsWith(n)),
    )
      .sort((a, b) => Number(norm(b.name).startsWith(n)) - Number(norm(a.name).startsWith(n)))
      .slice(0, 7)
      .map((p) => ({
        type: "place",
        id: p.id,
        label: p.name,
        sub: `${p.kind === "city" ? "City" : "Destination"} · ${p.country === "United States of America" ? "USA" : p.country}`,
        code: p.countryCode,
      }));
    const atlasName = (code: string) => PLACES.find((p) => p.countryCode === code)?.country;
    const countries: Result[] = Object.values(COUNTRIES)
      .filter((c) => norm(c.name).startsWith(n) && atlasName(c.code))
      .slice(0, 3)
      .map((c) => ({ type: "country", name: atlasName(c.code)!, label: c.name, sub: `Country · ${c.region}`, code: c.code }));
    return [...countries, ...places];
  }, [q]);

  const choose = (r: Result) => {
    if (r.type === "place") onPlace(r.id);
    else onCountry(r.name);
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full">
      <div className="glass flex items-center gap-2 rounded-2xl px-3.5 py-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-sky-300/70">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              choose(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search cities, destinations, countries…"
          className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
          aria-label="Search"
        />
        <kbd className="hidden rounded border border-white/10 px-1.5 text-[10px] text-slate-400 sm:block">/</kbd>
      </div>
      {open && results.length > 0 && (
        <ul className="glass scroll-thin absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-auto rounded-2xl p-1.5">
          {results.map((r, i) => (
            <li key={r.type === "place" ? r.id : "c-" + r.name}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${i === active ? "bg-sky-400/10" : ""}`}
              >
                <span className="text-lg">{flagEmoji(r.code)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white">{r.label}</span>
                  <span className="block truncate text-xs text-slate-400">{r.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
