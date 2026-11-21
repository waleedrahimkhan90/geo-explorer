import type { Category, CurrentWeather, Place, Scores } from "./types";
import { isRainy, isSnowy } from "./weather";

export type WeatherPref = "any" | "warm" | "mild" | "cold";
export type BudgetPref = 0 | 1 | 2 | 3;
export type Filters = { categories: Category[]; weather: WeatherPref; budget: BudgetPref };

export const EMPTY_FILTERS: Filters = { categories: [], weather: "any", budget: 0 };

export const isActive = (f: Filters) => f.categories.length > 0 || f.weather !== "any" || f.budget !== 0;

const CATEGORY_SCORE: Record<Category, keyof Scores> = {
  beaches: "relaxation",
  mountains: "nature",
  history: "history",
  adventure: "adventure",
  nightlife: "nightlife",
  romantic: "relaxation",
  nature: "nature",
  wildlife: "nature",
  desert: "adventure",
};

export function weatherMatches(pref: WeatherPref, w?: CurrentWeather): boolean {
  if (pref === "any") return true;
  if (!w) return false;
  const t = w.temperature;
  if (pref === "warm") return t >= 22 && !isRainy(w.weatherCode);
  if (pref === "mild") return t >= 10 && t < 22 && !isRainy(w.weatherCode) && !isSnowy(w.weatherCode);
  return t <= 3 || isSnowy(w.weatherCode);
}

/** Filter + rank places. Ranking is transparent: category overlap first, then the related editorial scores. */
export function discover(places: Place[], f: Filters, weather?: Record<string, CurrentWeather>) {
  return places
    .filter((p) => f.categories.length === 0 || f.categories.some((c) => p.categories.includes(c)))
    .filter((p) => f.budget === 0 || (f.budget === 1 ? p.budget === 1 : p.budget === f.budget))
    .filter((p) => weatherMatches(f.weather, weather?.[p.id]))
    .map((p) => {
      const hits = f.categories.filter((c) => p.categories.includes(c));
      const fit = hits.length ? hits.reduce((s, c) => s + p.scores[CATEGORY_SCORE[c]], 0) / hits.length : 0;
      return { place: p, rank: hits.length * 10 + fit + (p.kind === "destination" ? 0.5 : 0) };
    })
    .sort((a, b) => b.rank - a.rank)
    .map((x) => x.place);
}
