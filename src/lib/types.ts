export type Category =
  | "beaches"
  | "mountains"
  | "history"
  | "adventure"
  | "nightlife"
  | "romantic"
  | "nature"
  | "wildlife"
  | "desert";

export type Scores = {
  adventure: number;
  relaxation: number;
  nightlife: number;
  family: number;
  nature: number;
  history: number;
  affordability: number;
};

export type Place = {
  id: string;
  name: string;
  kind: "city" | "destination";
  /** Must match the world-atlas country name (used to link polygons <-> places). */
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  lat: number;
  lng: number;
  timezone: string; // IANA
  /** English Wikipedia article title used for description + photo. */
  wiki: string;
  tagline: string;
  categories: Category[];
  /** 1 = budget friendly, 2 = moderate, 3 = luxury */
  budget: 1 | 2 | 3;
  /** Editorial 0–10 scores (curated v0, see README). */
  scores: Scores;
  /** Wikipedia article titles of notable attractions. */
  attractions: string[];
};

export type Country = {
  name: string;
  code: string;
  capital: string;
  currency: string; // ISO 4217
  languages: string[];
  region: string;
};

export type CurrentWeather = {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  isDay: boolean;
};

export type Forecast = {
  current: CurrentWeather & { apparent: number; humidity: number };
  daily: { date: string; max: number; min: number; weatherCode: number; precipProb: number | null }[];
};

export type WikiSummary = {
  title: string;
  description?: string;
  extract: string;
  url: string;
  image?: {
    src: string;
    thumb: string;
    fileUrl?: string;
    artist?: string;
    license?: string;
    licenseUrl?: string;
  };
};
