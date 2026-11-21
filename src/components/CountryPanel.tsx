"use client";

import { PLACES } from "@/data/places";
import { COUNTRIES, countryWikiTitle, flagEmoji } from "@/data/countries";
import { useJson } from "@/lib/hooks";
import type { CurrentWeather, WikiSummary } from "@/lib/types";
import { PlaceList } from "./DiscoverPanel";
import { CountryFacts, SectionTitle } from "./PlacePanel";

export default function CountryPanel({
  name,
  weather,
  onSelect,
  onClose,
}: {
  name: string;
  weather?: Record<string, CurrentWeather>;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const places = PLACES.filter((p) => p.country === name);
  const code = places[0]?.countryCode ?? Object.values(COUNTRIES).find((c) => c.name === name)?.code;
  const display = (code && COUNTRIES[code]?.name) || name;
  const wiki = useJson<WikiSummary>(`/api/wiki?title=${encodeURIComponent(countryWikiTitle(display))}`);

  return (
    <div key={name} className="glass panel-enter flex h-full flex-col overflow-hidden rounded-3xl">
      <div className="scroll-thin flex-1 overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-sky-200/80">Country</div>
            <h2 className="mt-1 text-3xl font-semibold text-white">
              {code && <span className="mr-2">{flagEmoji(code)}</span>}
              {display}
            </h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white hover:bg-white/10" aria-label="Close">
            ✕
          </button>
        </div>

        {wiki.data?.extract && (
          <p className="mt-4 line-clamp-6 text-sm leading-relaxed text-slate-300">
            {wiki.data.extract}{" "}
            <a href={wiki.data.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">
              Wikipedia ↗
            </a>
          </p>
        )}

        <div className="mt-6 space-y-6">
          {code && <CountryFacts code={code} />}
          <div>
            <SectionTitle>Places to explore</SectionTitle>
            {places.length ? (
              <PlaceList places={places} weather={weather} onSelect={onSelect} />
            ) : (
              <p className="text-sm text-slate-400">No curated destinations here yet. The dataset grows in Phase 3.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
