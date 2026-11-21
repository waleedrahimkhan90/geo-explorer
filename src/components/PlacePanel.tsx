"use client";

import { useState } from "react";
import { CATEGORY_META, PLACES } from "@/data/places";
import { COUNTRIES, flagEmoji } from "@/data/countries";
import { nearby } from "@/lib/geo";
import { useJson, useNow, usePlaceImage } from "@/lib/hooks";
import { diffFromViewer, localTime, offsetLabel } from "@/lib/time";
import { describeWeather } from "@/lib/weather";
import type { Forecast, Place, Scores, WikiSummary } from "@/lib/types";

type Props = {
  place: Place;
  saved: boolean;
  comparing: boolean;
  onToggleSave: () => void;
  onToggleCompare: () => void;
  onSelect: (id: string) => void;
  onCountry: (name: string) => void;
  onClose: () => void;
};

const SCORE_LABELS: Record<keyof Scores, string> = {
  adventure: "Adventure",
  relaxation: "Relaxation",
  nightlife: "Nightlife",
  family: "Family friendly",
  nature: "Natural beauty",
  history: "History & culture",
  affordability: "Affordability",
};

export default function PlacePanel(props: Props) {
  const { place, saved, comparing, onToggleSave, onToggleCompare, onSelect, onCountry, onClose } = props;
  const wiki = useJson<WikiSummary>(`/api/wiki?title=${encodeURIComponent(place.wiki)}`);
  const hero = usePlaceImage(place);
  const img = hero.image;
  const fc = useJson<Forecast>(`/api/weather?lat=${place.lat}&lng=${place.lng}`);
  const country = COUNTRIES[place.countryCode];

  return (
    <div key={place.id} className="glass panel-enter flex h-full flex-col overflow-hidden rounded-3xl">
      <div className="scroll-thin flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="relative h-56 w-full overflow-hidden bg-slate-900 sm:h-64">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.src} alt={hero.from ?? place.name} className="h-full w-full object-cover" />
          ) : (
            <div className={`h-full w-full ${hero.loading ? "shimmer" : "bg-gradient-to-br from-sky-900/40 to-violet-900/40"}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060a16] via-[#060a16]/30 to-transparent" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-sky-200/80">
              <span>{place.kind === "city" ? "City" : "Destination"}</span>
              <span>·</span>
              <button className="hover:text-white hover:underline" onClick={() => onCountry(place.country)}>
                {flagEmoji(place.countryCode)} {country?.name ?? place.country}
              </button>
            </div>
            <h2 className="text-3xl font-semibold leading-tight text-white">{place.name}</h2>
            <p className="mt-1 text-sm text-slate-300">{place.tagline}</p>
          </div>
        </div>
        {img && (
          <div className="truncate px-5 pt-1.5 text-[10px] text-slate-500">
            {hero.from ? `${hero.from} · ` : ""}Photo:{" "}
            <a href={img.fileUrl ?? wiki.data?.url} target="_blank" rel="noreferrer" className="hover:text-slate-300">
              {img.artist ?? "see source"}
            </a>
            {img.license && (
              <>
                {" · "}
                {img.licenseUrl ? (
                  <a href={img.licenseUrl} target="_blank" rel="noreferrer" className="hover:text-slate-300">
                    {img.license}
                  </a>
                ) : (
                  img.license
                )}
              </>
            )}{" "}
            · Wikimedia Commons
          </div>
        )}

        <div className="space-y-6 p-5">
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button className="chip" data-on={saved} onClick={onToggleSave}>
              {saved ? "♥ Saved" : "♡ Save"}
            </button>
            <button className="chip" data-on={comparing} onClick={onToggleCompare}>
              ⇄ {comparing ? "In compare" : "Compare"}
            </button>
            {place.categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </span>
            ))}
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-2 gap-3">
            <LocalTimeCard timezone={place.timezone} />
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Weather now</div>
              {fc.data ? (
                <>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl">{describeWeather(fc.data.current.weatherCode, fc.data.current.isDay).icon}</span>
                    <span className="text-2xl font-semibold text-white">{Math.round(fc.data.current.temperature)}°C</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {describeWeather(fc.data.current.weatherCode).label} · feels {Math.round(fc.data.current.apparent)}°
                  </div>
                </>
              ) : fc.error ? (
                <div className="mt-2 text-xs text-slate-500">Weather unavailable</div>
              ) : (
                <div className="shimmer mt-2 h-10 rounded-lg" />
              )}
            </div>
          </div>

          {/* Forecast */}
          {fc.data && (
            <div>
              <SectionTitle>7-day forecast</SectionTitle>
              <div className="grid grid-cols-7 gap-1 text-center">
                {fc.data.daily.map((d) => (
                  <div key={d.date} className="rounded-xl bg-white/[0.03] px-0.5 py-2">
                    <div className="text-[10px] text-slate-400">
                      {new Date(d.date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}
                    </div>
                    <div className="my-1 text-lg">{describeWeather(d.weatherCode).icon}</div>
                    <div className="text-xs font-semibold text-white">{Math.round(d.max)}°</div>
                    <div className="text-[10px] text-slate-500">{Math.round(d.min)}°</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          <div>
            <SectionTitle>About</SectionTitle>
            {wiki.data ? (
              <>
                <p className="text-sm leading-relaxed text-slate-300">{wiki.data.extract}</p>
                <a href={wiki.data.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-sky-300 hover:underline">
                  Read more on Wikipedia ↗
                </a>
              </>
            ) : wiki.error ? (
              <p className="text-sm text-slate-500">Description unavailable right now.</p>
            ) : (
              <div className="space-y-2">
                <div className="shimmer h-3 rounded" />
                <div className="shimmer h-3 rounded" />
                <div className="shimmer h-3 w-2/3 rounded" />
              </div>
            )}
          </div>

          {/* Attractions */}
          <div>
            <SectionTitle>Top attractions</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              {place.attractions.map((a) => (
                <AttractionCard key={a} title={a} />
              ))}
            </div>
          </div>

          {/* Profile */}
          <div>
            <SectionTitle hint="Curated editorial estimates (v0), not user ratings">Destination profile</SectionTitle>
            <div className="space-y-2">
              {(Object.keys(SCORE_LABELS) as (keyof Scores)[]).map((k) => (
                <ScoreBar key={k} label={SCORE_LABELS[k]} value={place.scores[k]} />
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Typical budget: <span className="text-slate-200">{"$".repeat(place.budget)}</span>
              <span className="text-slate-600">{"$".repeat(3 - place.budget)}</span>
            </div>
          </div>

          {/* Country */}
          {country && <CountryFacts code={place.countryCode} />}

          {/* Nearby */}
          <NearbyList place={place} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">{children}</h3>
      {hint && <span className="text-right text-[10px] text-slate-500">{hint}</span>}
    </div>
  );
}

function LocalTimeCard({ timezone }: { timezone: string }) {
  const now = useNow(10_000);
  const t = localTime(timezone, now);
  const night = t.hour < 6 || t.hour >= 19;
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">Local time</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl">{night ? "🌙" : "🌞"}</span>
        <span className="font-mono text-2xl font-semibold text-white">{t.time}</span>
      </div>
      <div className="text-xs text-slate-400">
        {t.day} · {offsetLabel(timezone, now)}
      </div>
      <div className="text-[11px] text-slate-500">{diffFromViewer(timezone, now)}</div>
    </div>
  );
}

function AttractionCard({ title }: { title: string }) {
  const { data, error, loading } = useJson<WikiSummary>(`/api/wiki?title=${encodeURIComponent(title)}`);
  const [open, setOpen] = useState(false);
  if (error) return null;
  if (loading || !data) return <div className="shimmer h-36 rounded-2xl" />;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((o) => !o))}
      className={`group cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] text-left transition hover:border-sky-300/30 ${open ? "col-span-2" : ""}`}
    >
      <div className={`relative w-full overflow-hidden bg-slate-800 ${open ? "h-44" : "h-24"}`}>
        {data.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.image.thumb} alt={data.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-2xl">📍</div>
        )}
      </div>
      <div className="p-2.5">
        <div className="truncate text-sm font-medium text-white">{data.title}</div>
        {data.description && <div className="line-clamp-1 text-[11px] text-slate-400">{data.description}</div>}
        {open && (
          <>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{data.extract}</p>
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 inline-block text-[11px] text-sky-300 hover:underline"
            >
              Wikipedia ↗
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 text-xs text-slate-300">{label}</div>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
          style={{ width: `${value * 10}%`, transition: "width .6s cubic-bezier(.2,.8,.2,1)" }}
        />
      </div>
      <div className="w-6 text-right font-mono text-xs text-slate-400">{value}</div>
    </div>
  );
}

export function CountryFacts({ code }: { code: string }) {
  const c = COUNTRIES[code];
  const fx = useJson<{ rate: number; source: string }>(c && c.currency !== "USD" ? `/api/fx?from=USD&to=${c.currency}` : null);
  if (!c) return null;
  const rate = fx.data?.rate;
  return (
    <div>
      <SectionTitle>Country essentials</SectionTitle>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Fact label="Country" value={`${flagEmoji(code)} ${c.name}`} />
        <Fact label="Capital" value={c.capital} />
        <Fact label="Languages" value={c.languages.join(", ")} />
        <Fact
          label="Currency"
          value={
            c.currency === "USD"
              ? "USD (US dollar)"
              : rate
                ? `1 USD ≈ ${rate >= 100 ? Math.round(rate).toLocaleString() : rate.toFixed(2)} ${c.currency}`
                : fx.error
                  ? c.currency
                  : `${c.currency} …`
          }
          hint={fx.data?.source}
        />
      </div>
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-slate-200">{value}</div>
      {hint && <div className="text-[9px] text-slate-500">via {hint}</div>}
    </div>
  );
}

function NearbyList({ place, onSelect }: { place: Place; onSelect: (id: string) => void }) {
  const list = nearby(place, PLACES);
  if (!list.length) return null;
  return (
    <div>
      <SectionTitle>Nearby on GeoExplorer</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {list.map(({ place: p, km }) => (
          <button key={p.id} className="chip text-xs" onClick={() => onSelect(p.id)}>
            {flagEmoji(p.countryCode)} {p.name} <span className="text-slate-500">{Math.round(km).toLocaleString()} km</span>
          </button>
        ))}
      </div>
    </div>
  );
}
