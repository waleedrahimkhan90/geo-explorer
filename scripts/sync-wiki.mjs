/**
 * Syncs Wikipedia descriptions, lead images and Wikimedia Commons licence info for every
 * place, attraction and country in the dataset into src/data/wiki.json.
 *
 * Static content lives in our own data store (this file now, Supabase later), so browsing the
 * globe never hammers Wikipedia. Uses the batched Action API (20 titles/request) politely.
 *
 *   npm run sync:wiki            # fetch only missing titles
 *   npm run sync:wiki -- --all   # refresh everything
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src/data/wiki.json");
const UA = "GeoExplorer/0.1 (prototype travel discovery app; data sync script)";
const API = "https://en.wikipedia.org/w/api.php";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function collectTitles() {
  const places = fs.readFileSync(path.join(ROOT, "src/data/places.ts"), "utf8");
  const countries = fs.readFileSync(path.join(ROOT, "src/data/countries.ts"), "utf8");
  const titles = new Set();
  for (const m of places.matchAll(/^\s*p\("[^"]+",.*?"[^"]+", "([^"]+)", "[^"]+", \[[^\]]*\], \d, \[[^\]]*\], \[([^\]]*)\]\)/gm)) {
    titles.add(m[1]);
    for (const a of m[2].matchAll(/"([^"]+)"/g)) titles.add(a[1]);
  }
  for (const m of countries.matchAll(/^\s*\["[A-Z]{2}", "([^"]+)"/gm)) titles.add(m[1] === "Georgia" ? "Georgia (country)" : m[1]);
  return [...titles];
}

async function api(params) {
  const url = API + "?" + new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || 5000 * (attempt + 1);
      console.warn(`  ${res.status}, retrying in ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  throw new Error("gave up after retries");
}

/** Plaintext extracts leave pronunciation debris like "(English: ; ...)" in the lead sentence. */
const stripPronunciation = (t) => {
  const m = t.slice(0, 300).match(/\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/);
  if (m && /[;[/]|pronounced|listen|English:|lit\./.test(m[1])) t = t.slice(0, m.index) + t.slice(m.index + m[0].length);
  return t.replace(/\s{2,}/g, " ").replace(/ ,/g, ",").trim();
};
const firstParagraph = (s = "") => {
  let p = s.split("\n").map((x) => x.trim()).filter(Boolean)[0] ?? "";
  for (let i = 0; i < 3; i++) p = stripPronunciation(p);
  if (p.length <= 900) return p;
  const cut = p.slice(0, 900);
  return cut.slice(0, cut.lastIndexOf(". ") + 1) || cut + "…";
};
const stripHtml = (s) => (s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() || undefined;
const fileFromUrl = (u) => {
  const m = u?.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};
/** Lead images that are flags, emblems or maps make poor travel photos. */
const UNSUITABLE = /Flag_of|Coat_of_arms|Emblem_of|Seal_of|Locator|location_map|_map\b|\.svg/i;
const cleanArtist = (a) => (!a || /^see /i.test(a) || a.length > 80 || /unknown/i.test(a) ? undefined : a);
const resize = (u, w) => (/\/\d+px-/.test(u) ? u.replace(/\/\d+px-/, `/${w}px-`) : u);

async function main() {
  const all = process.argv.includes("--all");
  const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const titles = collectTitles().filter((t) => all || !existing[t]);
  console.log(`${titles.length} titles to sync`);
  const out = { ...existing };
  const files = new Map(); // title -> commons file name

  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const b = await api({
      action: "query",
      prop: "extracts|pageimages|description|info",
      exintro: "1",
      explaintext: "1",
      exlimit: "max",
      piprop: "thumbnail|original",
      pithumbsize: "1280",
      inprop: "url",
      redirects: "1",
      titles: batch.join("|"),
    });
    const q = b.query ?? {};
    // map requested title -> final page title (normalisation + redirects)
    const resolve = (t) => {
      let cur = t;
      for (const n of q.normalized ?? []) if (n.from === cur) cur = n.to;
      for (const r of q.redirects ?? []) if (r.from === cur) cur = r.to;
      return cur;
    };
    const pages = new Map((q.pages ?? []).map((p) => [p.title, p]));
    for (const t of batch) {
      const page = pages.get(resolve(t));
      if (!page || page.missing || page.invalid) {
        console.warn(`  missing: ${t}`);
        continue;
      }
      const thumb1280 = page.thumbnail?.source;
      const original = page.original?.source;
      let src = thumb1280 ?? original;
      if (src && UNSUITABLE.test(original ?? src)) src = undefined;
      out[t] = {
        title: page.title,
        description: page.description,
        extract: firstParagraph(page.extract),
        url: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
        image: src ? { src, thumb: resize(src, 500) } : undefined,
      };
      const file = src && fileFromUrl(original ?? src);
      if (file) files.set(t, file);
    }
    process.stdout.write(`  pages ${Math.min(i + 20, titles.length)}/${titles.length}\r`);
    await sleep(1200);
  }
  console.log();

  // Licence + author for every image (Commons files are served through en.wikipedia's imageinfo)
  const fileList = [...new Set(files.values())];
  const meta = new Map();
  for (let i = 0; i < fileList.length; i += 40) {
    const batch = fileList.slice(i, i + 40);
    const b = await api({
      action: "query",
      prop: "imageinfo",
      iiprop: "extmetadata|url",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
      titles: batch.map((f) => "File:" + f).join("|"),
    });
    const q = b.query ?? {};
    const norm = new Map((q.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of q.pages ?? []) {
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const requested = (norm.get(p.title) ?? p.title).replace(/^File:/, "");
      const m = info.extmetadata ?? {};
      const entry = {
        fileUrl: info.descriptionurl,
        artist: cleanArtist(stripHtml(m.Artist?.value)),
        license: stripHtml(m.LicenseShortName?.value),
        licenseUrl: m.LicenseUrl?.value,
      };
      meta.set(requested, entry);
      meta.set(p.title.replace(/^File:/, ""), entry);
    }
    process.stdout.write(`  licences ${Math.min(i + 40, fileList.length)}/${fileList.length}\r`);
    await sleep(1200);
  }
  console.log();
  for (const [t, f] of files) {
    const m = meta.get(f) ?? meta.get(f.replace(/_/g, " "));
    if (m && out[t]?.image) Object.assign(out[t].image, m);
  }

  const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 1));
  const withImg = Object.values(sorted).filter((v) => v.image).length;
  const withLic = Object.values(sorted).filter((v) => v.image?.license).length;
  console.log(`wrote ${Object.keys(sorted).length} entries (${withImg} with images, ${withLic} with licence info) to ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
