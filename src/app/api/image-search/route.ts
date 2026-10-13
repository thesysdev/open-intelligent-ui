// Photo search for the Image component: Wikipedia lead images for the best
// matching articles, then Wikimedia Commons files. Runs on the server so the
// browser makes one same-origin request per description and results are cached.

const cache = new Map<string, string[]>();
const HEADERS = { "User-Agent": "open-intelligent-ui (https://github.com/thesysdev/open-intelligent-ui)" };
const SKIP = /\.svg|icon|logo|map|flag|seal|coat_of_arms|signature|diagram/i;
const WIDTH = 960;

type Page = { index?: number; thumbnail?: { source?: string }; imageinfo?: { thumburl?: string; url?: string; mime?: string }[] };

async function query(host: string, params: Record<string, string>): Promise<Page[]> {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", ...params })}`;
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`${host} ${response.status}`);
  const data: { error?: { code?: string }; query?: { pages?: Page[] } } = await response.json();
  // MediaWiki can report maxlag, rate limits and internal errors with HTTP 200.
  // These are retryable failures, not empty search results to cache.
  if (data.error) throw new Error(`MediaWiki ${data.error.code ?? "query failed"}`);
  return (data.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

// Words that say what the photo shows; an article must share one with the query.
const words = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3);

type TitledPage = Page & { title?: string };

async function search(q: string): Promise<string[]> {
  const images: string[] = [];
  const add = (url: string | undefined) => {
    if (url && url.startsWith("https://") && !SKIP.test(url) && !images.includes(url)) images.push(url);
  };
  const wanted = new Set(words(q));
  // Wikipedia articles first, but only ones whose title is about the query:
  // a search for a dish should not return a restaurant chain's storefront.
  const articles = (await query("en.wikipedia.org", { generator: "search", gsrsearch: q, gsrlimit: "6", prop: "pageimages", piprop: "thumbnail", pithumbsize: String(WIDTH) })) as TitledPage[];
  articles.filter((page) => words(page.title ?? "").some((w) => wanted.has(w))).forEach((page) => add(page.thumbnail?.source));
  // Then Commons files, dropping trailing words when a long description finds nothing.
  const terms = q.split(/\s+/);
  const tries = [...new Set([terms.join(" "), terms.slice(0, 3).join(" "), terms.slice(0, 2).join(" ")])];
  for (const t of tries) {
    if (images.length >= 3) break;
    const files = await query("commons.wikimedia.org", { generator: "search", gsrsearch: `${t} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "6", prop: "imageinfo", iiprop: "url|mime", iiurlwidth: String(WIDTH) });
    files.forEach((page) => {
      const info = page.imageinfo?.[0];
      if (info?.mime?.startsWith("image/")) add(info.thumburl ?? info.url);
    });
  }
  return images.slice(0, 4);
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.replace(/\s+/g, " ").trim();
  if (!q || q.length < 2 || q.length > 200) return Response.json({ error: { message: "q must be 2 to 200 characters" } }, { status: 400 });
  let images = cache.get(q);
  if (!images) {
    try {
      images = await search(q);
    } catch {
      return Response.json({ error: { message: "Image search unavailable" } }, { status: 502 });
    }
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(q, images);
  }
  return Response.json({ images }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
