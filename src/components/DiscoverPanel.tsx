"use client";

import { useState } from "react";
import { CATEGORY_META, PLACE_BY_ID } from "@/data/places";
import { flagEmoji } from "@/data/countries";
import { type BudgetPref, type Filters, type WeatherPref, EMPTY_FILTERS, isActive } from "@/lib/discover";
import { describeWeather } from "@/lib/weather";
import type { Category, CurrentWeather, Place } from "@/lib/types";

const WEATHER: { id: WeatherPref; label: string }[] = [
  { id: "any", label: "Any weather" },
  { id: "warm", label: "☀️ Warm & dry" },
  { id: "mild", label: "🌤 Cool & pleasant" },
  { id: "cold", label: "❄️ Cold & snowy" },
];
const BUDGET: { id: BudgetPref; label: string }[] = [
  { id: 0, label: "Any budget" },
  { id: 1, label: "$ Budget" },
  { id: 2, label: "$$ Moderate" },
  { id: 3, label: "$$$ Luxury" },
];

type Props = {
  filters: Filters;
  setFilters: (f: Filters) => void;
  results: Place[];
  weather?: Record<string, CurrentWeather>;
  saved: string[];
  recent: string[];
  onSelect: (id: string) => void;
  onExplore: () => void;
  onSurprise: () => void;
  onClose?: () => void;
};

export default function DiscoverPanel(props: Props) {
  const { filters, setFilters, results, weather, saved, recent, onSelect, onExplore, onSurprise, onClose } = props;
  const [tab, setTab] = useState<"discover" | "saved">("discover");
  const active = isActive(filters);

  const toggleCat = (c: Category) =>
    setFilters({
      ...filters,
      categories: filters.categories.includes(c) ? filters.categories.filter((x) => x !== c) : [...filters.categories, c],
    });

  return (
    <div className="glass panel-enter flex max-h-full flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center gap-1 border-b border-white/5 p-2">
        {(["discover", "saved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${tab === t ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            {t === "discover" ? "✦ Discover" : `♥ Saved${saved.length ? ` (${saved.length})` : ""}`}
          </button>
        ))}
        {onClose && (
          <button onClick={onClose} className="ml-1 rounded-xl px-3 py-2 text-slate-400 hover:text-white" aria-label="Close panel">
            ✕
          </button>
        )}
      </div>

      {tab === "discover" ? (
        <div className="scroll-thin flex-1 overflow-y-auto p-4">
          <h2 className="text-lg font-semibold text-white">What would you like to discover?</h2>
          <p className="mt-0.5 text-xs text-slate-400">The globe highlights places that match. Weather uses live conditions.</p>

          <Section title="Experience">
            {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
              <button key={c} className="chip" data-on={filters.categories.includes(c)} onClick={() => toggleCat(c)}>
                <span>{CATEGORY_META[c].emoji}</span>
                {CATEGORY_META[c].label}
              </button>
            ))}
          </Section>

          <Section title="Weather right now">
            {WEATHER.map((w) => (
              <button key={w.id} className="chip" data-on={filters.weather === w.id} onClick={() => setFilters({ ...filters, weather: w.id })}>
                {w.label}
              </button>
            ))}
          </Section>

          <Section title="Budget">
            {BUDGET.map((b) => (
              <button key={b.id} className="chip" data-on={filters.budget === b.id} onClick={() => setFilters({ ...filters, budget: b.id })}>
                {b.label}
              </button>
            ))}
          </Section>

          <div className="mt-5 flex gap-2">
            <button className="btn-primary flex-1" onClick={onExplore} disabled={active && results.length === 0}>
              Explore my world
            </button>
            <button className="btn-ghost" onClick={onSurprise} title="Fly to a random destination">
              🎲
            </button>
            {active && (
              <button className="btn-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
                Reset
              </button>
            )}
          </div>

          {active && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                {results.length} {results.length === 1 ? "match" : "matches"}
              </div>
              {results.length === 0 && (
                <p className="text-sm text-slate-400">Nothing matches every filter right now. Try loosening the weather or budget.</p>
              )}
              <PlaceList places={results.slice(0, 30)} weather={weather} onSelect={onSelect} />
            </div>
          )}
        </div>
      ) : (
        <div className="scroll-thin flex-1 overflow-y-auto p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Saved places</h3>
          {saved.length === 0 ? (
            <p className="text-sm text-slate-400">Tap ♥ on any destination to save it here.</p>
          ) : (
            <PlaceList places={saved.map((id) => PLACE_BY_ID.get(id)!).filter(Boolean)} weather={weather} onSelect={onSelect} />
          )}
          <p className="mt-2 text-[11px] text-slate-500">Saved on this device. Accounts and synced collections are coming in a later phase.</p>
          {recent.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-xs font-medium uppercase tracking-wider text-slate-400">Recently explored</h3>
              <PlaceList places={recent.map((id) => PLACE_BY_ID.get(id)!).filter(Boolean)} weather={weather} onSelect={onSelect} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function PlaceList({
  places,
  weather,
  onSelect,
}: {
  places: Place[];
  weather?: Record<string, CurrentWeather>;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {places.map((p) => {
        const w = weather?.[p.id];
        const d = w && describeWeather(w.weatherCode, w.isDay);
        return (
          <li key={p.id}>
            <button
              onClick={() => onSelect(p.id)}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/5"
            >
              <span className="text-lg">{flagEmoji(p.countryCode)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-white">{p.name}</span>
                <span className="block truncate text-xs text-slate-400">{p.tagline}</span>
              </span>
              {w && d && (
                <span className="shrink-0 text-xs text-slate-300" title={d.label}>
                  {d.icon} {Math.round(w.temperature)}°
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
