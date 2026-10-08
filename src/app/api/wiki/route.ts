// Wikipedia lookups for photo fallbacks and coordinates. Runs on the server so
// the browser makes one same-origin request per place and results are cached.

type WikiSummary = { thumbnail?: { source?: string }; coordinates?: { lat?: number; lon?: number } };
type WikiMedia = { items?: { type?: string; srcset?: { src: string }[] }[] };
export type WikiInfo = { lat?: number; lng?: number; photos: string[] };

const cache = new Map<string, WikiInfo>();
const HEADERS = { "User-Agent": "open-intelligent-ui (https://github.com/thesysdev/open-intelligent-ui)" };

// A missing article is a real answer (cached); any other failure is retried next time.
async function get(url: string) {
  const response = await fetch(url, { headers: HEADERS });
  if (response.status === 404) return {};
  if (!response.ok) throw new Error(`Wikipedia ${response.status}`);
  return response.json();
}

export async function GET(req: Request) {
  const title = new URL(req.url).searchParams.get("title")?.trim();
  if (!title || title.length > 200) return Response.json({ error: { message: "title is required" } }, { status: 400 });
  let info = cache.get(title);
  if (!info) {
    const t = encodeURIComponent(title.replace(/ /g, "_"));
    try {
      const [summary, media]: [WikiSummary, WikiMedia] = await Promise.all([
        get(`https://en.wikipedia.org/api/rest_v1/page/summary/${t}`),
        get(`https://en.wikipedia.org/api/rest_v1/page/media-list/${t}`),
      ]);
      // Lead image first, then up to two more photos; skip maps, logos, flags and SVGs.
      const photos: string[] = [];
      const key = (u: string) => decodeURIComponent(u.split("?")[0].split("/").slice(-1)[0]).replace(/^\d+px-/, "");
      if (summary?.thumbnail?.source) photos.push(summary.thumbnail.source);
      for (const item of media?.items ?? []) {
        if (item.type !== "image" || !item.srcset?.length) continue;
        const src = item.srcset[0].src;
        if (/\.svg|icon|logo|map|flag|seal/i.test(src)) continue;
        const url = src.startsWith("//") ? `https:${src}` : src;
        if (!photos.some((p) => key(p) === key(url))) photos.push(url);
        if (photos.length >= 3) break;
      }
      info = { lat: summary?.coordinates?.lat, lng: summary?.coordinates?.lon, photos };
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(title, info);
    } catch {
      return Response.json({ error: { message: "Wikipedia unavailable" } }, { status: 502 });
    }
  }
  return Response.json(info, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
