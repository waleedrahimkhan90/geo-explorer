"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PLACES, PLACE_BY_ID } from "@/data/places";
import { discover, EMPTY_FILTERS, type Filters, isActive } from "@/lib/discover";
import { useJson, useStored } from "@/lib/hooks";
import { tempColor } from "@/lib/weather";
import type { CurrentWeather } from "@/lib/types";
import type { FlyTarget, Layers } from "./GlobeView";
import SearchBox from "./SearchBox";
import DiscoverPanel from "./DiscoverPanel";
import PlacePanel from "./PlacePanel";
import CountryPanel from "./CountryPanel";
import CompareModal from "./CompareModal";

const GlobeView = dynamic(() => import("./GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <div className="h-40 w-40 animate-pulse rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20 blur-xl" />
    </div>
  ),
});

const NO_IDS: string[] = [];
const SAVED_LIMIT = 25;

export default function Explorer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [countryName, setCountryName] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [layers, setLayers] = useState<Layers>({ dayNight: true, weather: false, borders: true });
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [saved, setSaved] = useStored<string[]>("ge:saved", NO_IDS);
  const [recent, setRecent] = useStored<string[]>("ge:recent", NO_IDS);

  const { data: weather } = useJson<Record<string, CurrentWeather>>("/api/weather/batch");

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) setLeftOpen(true);
  }, []);

  // Escape closes the top-most layer: compare dialog, then the detail panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (e.target instanceof HTMLElement && e.target.tagName === "INPUT")) return;
      if (showCompare) setShowCompare(false);
      else if (selectedId) setSelectedId(null);
      else if (countryName) setCountryName(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCompare, selectedId, countryName]);

  const results = useMemo(() => discover(PLACES, filters, weather), [filters, weather]);
  const highlightIds = useMemo(() => (isActive(filters) ? new Set(results.map((p) => p.id)) : null), [filters, results]);

  const isMobile = () => typeof window !== "undefined" && !window.matchMedia("(min-width: 768px)").matches;

  const selectPlace = useCallback(
    (id: string) => {
      const p = PLACE_BY_ID.get(id);
      if (!p) return;
      setInteracted(true);
      setSelectedId(id);
      setCountryName(null);
      setShowCompare(false);
      // On phones the detail sheet sits on the lower half, so aim the camera a bit south of the place.
      setFlyTo({ lat: p.lat - (isMobile() ? 12 : 0), lng: p.lng, altitude: 1.15, key: Date.now() });
      setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8));
      if (isMobile()) setLeftOpen(false);
    },
    [setRecent],
  );

  const selectCountry = useCallback((name: string) => {
    setInteracted(true);
    setCountryName(name);
    setSelectedId(null);
    const ps = PLACES.filter((p) => p.country === name);
    if (ps.length) {
      const lat = ps.reduce((s, p) => s + p.lat, 0) / ps.length;
      const lng = ps.reduce((s, p) => s + p.lng, 0) / ps.length;
      setFlyTo({ lat: lat - (isMobile() ? 10 : 0), lng, altitude: 1.6, key: Date.now() });
    }
    if (isMobile()) setLeftOpen(false);
  }, []);

  const toggleSave = (id: string) =>
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= SAVED_LIMIT ? s : [id, ...s]));

  const toggleCompare = (id: string) => {
    setCompare((c) => {
      const next = c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2);
      if (next.length === 2 && !c.includes(id)) setShowCompare(true);
      return next;
    });
  };

  const explore = () => {
    setInteracted(true);
    const list = isActive(filters) ? results : PLACES.filter((p) => p.kind === "destination");
    if (!list.length) return;
    selectPlace(isActive(filters) ? list[0].id : list[Math.floor(Math.random() * list.length)].id);
  };
  const surprise = () => {
    const pool = isActive(filters) && results.length ? results : PLACES;
    selectPlace(pool[Math.floor(Math.random() * pool.length)].id);
  };

  const selected = selectedId ? PLACE_BY_ID.get(selectedId) : null;
  const rightOpen = !!selected || !!countryName;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#03060f]">
      <GlobeView
        selectedId={selectedId}
        highlightIds={highlightIds}
        weather={weather}
        layers={layers}
        flyTo={flyTo}
        onSelectPlace={selectPlace}
        onSelectCountry={selectCountry}
      />

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 p-3 md:flex-row md:items-start md:gap-3 md:p-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="glass flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5">
            <div className="relative h-6 w-6 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 shadow-[0_0_16px_rgba(94,200,255,0.6)]">
              <div className="absolute inset-[3px] rounded-full border border-white/40" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Geo<span className="text-sky-300">Explorer</span>
            </span>
          </div>
          <div className="flex-1 md:hidden">
            <SearchBox onPlace={selectPlace} onCountry={selectCountry} />
          </div>
        </div>
        <div className="pointer-events-auto hidden w-full max-w-md md:block">
          <SearchBox onPlace={selectPlace} onCountry={selectCountry} />
        </div>
        <div className="pointer-events-auto flex gap-2 overflow-x-auto md:ml-auto">
          <button className="chip glass shrink-0 md:hidden" data-on={leftOpen} onClick={() => setLeftOpen((o) => !o)}>
            ✦ Discover
          </button>
          <LayerToggle on={layers.dayNight} onClick={() => setLayers((l) => ({ ...l, dayNight: !l.dayNight }))} label="🌗 Day / Night" />
          <LayerToggle on={layers.weather} onClick={() => setLayers((l) => ({ ...l, weather: !l.weather }))} label="🌡 Live weather" />
          <LayerToggle on={layers.borders} onClick={() => setLayers((l) => ({ ...l, borders: !l.borders }))} label="🗺 Borders" />
        </div>
      </header>

      {/* Left: Discover */}
      {leftOpen && (
        <aside className="absolute inset-x-2 bottom-2 z-20 max-h-[62dvh] md:inset-x-auto md:bottom-4 md:left-4 md:top-[84px] md:max-h-none md:w-[340px]">
          <DiscoverPanel
            filters={filters}
            setFilters={(f) => {
              setInteracted(true);
              setFilters(f);
            }}
            results={results}
            weather={weather}
            saved={saved}
            recent={recent}
            onSelect={selectPlace}
            onExplore={explore}
            onSurprise={surprise}
            onClose={() => setLeftOpen(false)}
          />
        </aside>
      )}

      {/* Right: details */}
      {rightOpen && (
        <aside className="absolute inset-x-2 bottom-2 z-30 h-[68dvh] md:inset-x-auto md:bottom-4 md:right-4 md:top-[84px] md:h-auto md:w-[420px]">
          {selected ? (
            <PlacePanel
              place={selected}
              saved={saved.includes(selected.id)}
              comparing={compare.includes(selected.id)}
              onToggleSave={() => toggleSave(selected.id)}
              onToggleCompare={() => toggleCompare(selected.id)}
              onSelect={selectPlace}
              onCountry={selectCountry}
              onClose={() => setSelectedId(null)}
            />
          ) : countryName ? (
            <CountryPanel name={countryName} weather={weather} onSelect={selectPlace} onClose={() => setCountryName(null)} />
          ) : null}
        </aside>
      )}

      {/* Compare tray */}
      {compare.length > 0 && !showCompare && (
        <div className="absolute bottom-4 left-1/2 z-40 hidden -translate-x-1/2 md:block">
          <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
            <span className="text-slate-400">Compare:</span>
            {compare.map((id) => (
              <button key={id} className="chip text-xs" onClick={() => toggleCompare(id)} title="Remove">
                {PLACE_BY_ID.get(id)?.name} ✕
              </button>
            ))}
            {compare.length === 2 ? (
              <button className="btn-primary py-1.5!" onClick={() => setShowCompare(true)}>
                Compare
              </button>
            ) : (
              <span className="text-xs text-slate-500">pick one more</span>
            )}
          </div>
        </div>
      )}
      {showCompare && compare.length === 2 && (
        <CompareModal ids={compare} weather={weather} onClose={() => setShowCompare(false)} onSelect={selectPlace} />
      )}

      {/* Intro */}
      {!interacted && !rightOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 hidden text-center md:block">
          <h1 className="text-4xl font-semibold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
            Discover the living planet
          </h1>
          <p className="mt-2 text-sm text-slate-300 drop-shadow">
            {PLACES.length} cities & destinations · live weather · real-time day & night. Drag to spin, click a light to explore.
          </p>
        </div>
      )}

      {/* Weather legend */}
      {layers.weather && (
        <div className="glass absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 md:flex" style={{ bottom: compare.length ? 72 : 16 }}>
          <span>−20°</span>
          <span
            className="h-1.5 w-40 rounded-full"
            style={{ background: `linear-gradient(90deg, ${[-20, 0, 12, 22, 30, 38].map(tempColor).join(",")})` }}
          />
          <span>38°C</span>
          {!weather && <span className="text-slate-500">loading…</span>}
        </div>
      )}

      {/* Attribution */}
      <footer className="pointer-events-auto absolute bottom-1 right-2 z-10 hidden text-[10px] text-slate-500 md:block" style={{ right: rightOpen ? 448 : 8 }}>
        Weather{" "}
        <a className="hover:text-slate-300" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{" "}
        · Text & photos{" "}
        <a className="hover:text-slate-300" href="https://www.wikipedia.org/" target="_blank" rel="noreferrer">
          Wikipedia
        </a>{" "}
        /{" "}
        <a className="hover:text-slate-300" href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">
          Wikimedia Commons
        </a>{" "}
        (CC BY-SA) · Imagery NASA Blue Marble · Borders{" "}
        <a className="hover:text-slate-300" href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
          Natural Earth
        </a>
      </footer>
    </main>
  );
}

function LayerToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button className="chip glass shrink-0 text-xs! md:text-sm!" data-on={on} onClick={onClick}>
      {label}
    </button>
  );
}
