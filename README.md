# GeoExplorer

A globe-first **visual discovery engine** for the planet. Spin a 3D Earth, see real-time day and night, find places by experience and live weather, and open rich destination pages.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # production build
npm run sync:wiki    # refresh Wikipedia snapshot (only fetches missing titles; --all to refresh everything)
```

No API keys or accounts are needed.

## What's in MVP v1.0

| Feature | Where |
| --- | --- |
| Interactive 3D Earth with real-time day/night shading and city lights | `src/components/GlobeView.tsx` (custom GLSL shader, sun position in `src/lib/geo.ts`) |
| 104 glowing markers: 45 cities (blue) and 59 destinations (gold) | `src/data/places.ts` |
| Country borders: hover to highlight, click for a country panel | Natural Earth 110m via `world-atlas` |
| Instant search over cities, destinations, countries and categories (press `/`) | `src/components/SearchBox.tsx`, runs locally with no geocoding API |
| Destination panel: photo with licence credit, live local time, current weather, 7-day forecast, Wikipedia description, top attractions, editorial profile, country essentials and USD exchange rate, nearby places | `src/components/PlacePanel.tsx` |
| **Discover Mode**: filter by experience, *live* weather (warm & dry / cool / cold & snowy) and budget; the globe highlights matches, and "Explore my world" flies to the best one | `src/components/DiscoverPanel.tsx`, `src/lib/discover.ts` |
| Live weather layer: markers coloured by current temperature | `/api/weather/batch` |
| Save places, recently explored, compare two destinations side by side | stored in `localStorage` for now |
| Responsive: side panels on desktop, bottom sheets on mobile | |

## Architecture

```
Browser (Next.js + React + Tailwind + globe.gl/three.js)
   │
   ├── /api/weather/batch  → Open-Meteo, all 104 places in ONE request, cached 30 min
   ├── /api/weather        → Open-Meteo 7-day forecast, cached 15 min
   ├── /api/fx             → Frankfurter (ECB); fallback open.er-api.com for e.g. PKR, cached 12 h
   └── /api/wiki           → served from src/data/wiki.json snapshot; live Wikipedia only as fallback
```

The route handlers are the "serverless proxy" layer from the blueprint. They set `s-maxage` headers so a CDN such as Cloudflare can cache them at the edge.

### Data strategy (as in the blueprint)

- **Static data** (places, countries, descriptions, photos, licences) lives in our repo: `src/data/*.ts` and `wiki.json`. It is shaped to move into Supabase tables (`cities`, `destinations`, `attractions`, `destination_images`) unchanged.
  - Why a snapshot? During development, calling Wikipedia per click quickly hit **HTTP 429 rate limits**. `scripts/sync-wiki.mjs` uses the batched Action API (20 titles per request) once. Normal browsing then makes zero Wikipedia calls.
  - The sync drops lead images that are flags, emblems or maps. Those places fall back to their first attraction's photo.
- **Live data** (weather, FX) is fetched on demand and cached.
- **User data** (saved places, recents) is in `localStorage` until Phase 4 (Supabase Auth).

### Honesty notes

- Destination scores (adventure, relaxation, …) are **curated editorial estimates (v0)**, labelled as such in the UI. They are not user ratings.
- "Warm & dry" means ≥ 22 °C and not raining right now. It isn't labelled "sunny" because at night it can't be.
- Photo credits (author, licence, link) come from Wikimedia Commons metadata. 508 of 526 entries have full licence info.

## Licences and terms to check before monetising

- **Open-Meteo**: the free tier is *non-commercial*. A paid plan or self-hosting is needed once subscriptions launch. Attribution is shown in the footer.
- **Wikipedia text**: CC BY-SA. **Photos**: per-file licences, shown on each hero image.
- **open.er-api.com**: free tier needs attribution. Frankfurter (ECB data) is used first.
- NASA Blue Marble imagery: public domain. Natural Earth: public domain.

## Deploying (free tier)

The target from the blueprint is Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare):

```bash
npm i -D @opennextjs/cloudflare wrangler
npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy
```

All API routes use only `fetch` and in-memory caches, with no Node-specific APIs, so they are Workers-compatible. This step needs your Cloudflare account and hasn't been run yet.

## Roadmap (next steps)

1. **Phase 2 polish**: per-attraction coordinates on the globe; PostGIS-ready "within 20 km" queries.
2. **Phase 3**: grow the dataset (Wikidata SPARQL import script → Supabase), add hidden gems and seasonal layers (cherry blossom, auroras).
3. **Phase 4**: Supabase Auth, synced collections (replace `useStored` in `src/lib/hooks.ts`).
4. **Phase 5–6**: itineraries, AI assistant grounded in our own data, `PaymentProvider` abstraction (Safepay / Paddle) with webhook-verified premium access.

## Project layout

```
src/
  app/            page, layout, global styles, api/* route handlers
  components/     Explorer (shell), GlobeView, SearchBox, DiscoverPanel, PlacePanel, CountryPanel, CompareModal
  data/           places.ts, countries.ts, wiki.json (synced snapshot)
  lib/            types, discover ranking, weather codes/colours, time zones, geo maths, hooks
public/textures/  NASA Blue Marble day, night lights, star field
scripts/          sync-wiki.mjs
```
