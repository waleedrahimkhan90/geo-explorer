import { cached, json, UA } from "@/lib/server";
import type { WikiSummary } from "@/lib/types";
import WIKI from "@/data/wiki.json";

/** Synced snapshot (see scripts/sync-wiki.mjs). Served first so normal browsing makes zero Wikipedia calls. */
const STATIC = WIKI as unknown as Record<string, WikiSummary>;

const TTL = 24 * 60 * 60;

const stripHtml = (s?: string) => (s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** Look up artist + licence for a Wikimedia Commons file (licence compliance for photos). */
async function imageLicense(imageUrl: string) {
  const m = imageUrl.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/);
  if (!m) return {};
  const file = decodeURIComponent(m[1]);
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url` +
    `&titles=${encodeURIComponent("File:" + file)}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, next: { revalidate: TTL } });
    if (!res.ok) return {};
    const b = await res.json();
    const page = Object.values(b?.query?.pages ?? {})[0] as
      | { imageinfo?: { descriptionurl?: string; extmetadata?: Record<string, { value: string }> }[] }
      | undefined;
    const info = page?.imageinfo?.[0];
    const meta = info?.extmetadata ?? {};
    return {
      fileUrl: info?.descriptionurl,
      artist: stripHtml(meta.Artist?.value) || undefined,
      license: stripHtml(meta.LicenseShortName?.value) || undefined,
      licenseUrl: meta.LicenseUrl?.value || undefined,
    };
  } catch {
    return {};
  }
}

/** Wikipedia page summary (description + lead image) with image attribution. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title")?.trim();
  const withLicense = searchParams.get("license") === "1";
  if (!title || title.length > 200) return json({ error: "missing title" }, 60, 400);

  const snapshot = STATIC[title];
  if (snapshot) return json(snapshot, TTL);

  try {
    const data = await cached<WikiSummary | null>(`wiki:${title}:${withLicense}`, TTL, async () => {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}?redirect=true`,
        { headers: { "user-agent": UA, accept: "application/json" }, next: { revalidate: TTL } },
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`wikipedia ${res.status}`);
      const b = await res.json();
      const original: string | undefined = b.originalimage?.source;
      const thumb: string | undefined = b.thumbnail?.source;
      // Avoid shipping multi-megabyte originals: request a ~1280px rendition when the original is large.
      const src =
        original && thumb && (b.originalimage?.width ?? 0) > 1400 && /\/\d+px-/.test(thumb)
          ? thumb.replace(/\/\d+px-/, "/1280px-")
          : original;
      const image = src || thumb
        ? {
            src: src ?? thumb!,
            thumb: thumb ?? src!,
            ...(withLicense ? await imageLicense(original ?? thumb!) : {}),
          }
        : undefined;
      return {
        title: b.title,
        description: b.description,
        extract: b.extract ?? "",
        url: b.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        image,
      };
    });
    if (!data) return json({ error: "not found" }, 3600, 404);
    return json(data, TTL);
  } catch (e) {
    return json({ error: String(e) }, 60, 502);
  }
}
