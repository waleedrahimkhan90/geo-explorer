/** Shared helpers for server route handlers (the "serverless proxy" layer). */
export const UA = "GeoExplorer/0.1 (prototype travel discovery app)";

export function json(data: unknown, maxAgeSeconds: number, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Lets a CDN (e.g. Cloudflare) cache responses at the edge.
      "cache-control": `public, max-age=${Math.min(maxAgeSeconds, 300)}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds}`,
    },
  });
}

/** Tiny in-memory TTL cache so a warm server instance doesn't refetch upstream data. */
const store = new Map<string, { exp: number; value: unknown }>();
export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.exp > Date.now()) return hit.value as T;
  const value = await fn();
  store.set(key, { exp: Date.now() + ttlSeconds * 1000, value });
  if (store.size > 2000) store.delete(store.keys().next().value as string);
  return value;
}
