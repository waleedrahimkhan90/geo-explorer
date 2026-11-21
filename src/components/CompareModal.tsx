"use client";

import { PLACE_BY_ID } from "@/data/places";
import { flagEmoji } from "@/data/countries";
import { useNow, usePlaceImage } from "@/lib/hooks";
import { localTime } from "@/lib/time";
import { describeWeather } from "@/lib/weather";
import type { CurrentWeather, Place, Scores } from "@/lib/types";

const ROWS: [keyof Scores, string][] = [
  ["adventure", "Adventure"],
  ["relaxation", "Relaxation"],
  ["nightlife", "Nightlife"],
  ["family", "Family friendly"],
  ["nature", "Natural beauty"],
  ["history", "History & culture"],
  ["affordability", "Affordability"],
];

export default function CompareModal({
  ids,
  weather,
  onClose,
  onSelect,
}: {
  ids: string[];
  weather?: Record<string, CurrentWeather>;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [a, b] = ids.map((id) => PLACE_BY_ID.get(id)!) as [Place, Place];
  const now = useNow(15_000);
  if (!a || !b) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass panel-enter scroll-thin max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Compare destinations</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[a, b].map((p) => (
            <Header key={p.id} place={p} weather={weather?.[p.id]} time={localTime(p.timezone, now).time} onSelect={onSelect} />
          ))}
        </div>
        <div className="mt-5 space-y-3">
          {ROWS.map(([k, label]) => {
            const va = a.scores[k];
            const vb = b.scores[k];
            return (
              <div key={k}>
                <div className="mb-1 text-center text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
                <div className="flex items-center gap-2">
                  <span className={`w-5 text-right font-mono text-xs ${va > vb ? "text-sky-300" : "text-slate-400"}`}>{va}</span>
                  <div className="flex h-2 flex-1 justify-end overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-l from-sky-400 to-sky-600" style={{ width: `${va * 10}%` }} />
                  </div>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600" style={{ width: `${vb * 10}%` }} />
                  </div>
                  <span className={`w-5 font-mono text-xs ${vb > va ? "text-violet-300" : "text-slate-400"}`}>{vb}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-[10px] text-slate-500">Scores are curated editorial estimates (v0), not user ratings.</p>
      </div>
    </div>
  );
}

function Header({ place, weather, time, onSelect }: { place: Place; weather?: CurrentWeather; time: string; onSelect: (id: string) => void }) {
  const { image } = usePlaceImage(place);
  const d = weather && describeWeather(weather.weatherCode, weather.isDay);
  return (
    <button onClick={() => onSelect(place.id)} className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] text-left hover:border-sky-300/30">
      <div className="h-28 bg-slate-800">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.thumb} alt={place.name} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="p-3">
        <div className="truncate font-semibold text-white">
          {flagEmoji(place.countryCode)} {place.name}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400">
          <span>🕒 {time}</span>
          {weather && d && (
            <span>
              {d.icon} {Math.round(weather.temperature)}°C
            </span>
          )}
          <span>{"$".repeat(place.budget)}</span>
        </div>
      </div>
    </button>
  );
}
