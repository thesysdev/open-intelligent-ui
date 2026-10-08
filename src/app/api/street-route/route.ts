// Street geometry between stops, from the public OSRM demo server. Runs on the
// server so the browser makes a same-origin request and results are cached.
// OSRM's driving profile is a road overview, not walking or transit directions.

const cache = new Map<string, [number, number][]>();
const MAX_STOPS = 25;

export async function GET(req: Request) {
  // "lng,lat;lng,lat;..." with at least two valid points.
  const coords = new URL(req.url).searchParams.get("coords") ?? "";
  const points = coords.split(";").map((pair) => pair.split(",").map(Number));
  const valid = points.length >= 2 && points.length <= MAX_STOPS
    && points.every(([lng, lat, ...rest]) => !rest.length && Math.abs(lng) <= 180 && Math.abs(lat) <= 90);
  if (!valid) return Response.json({ error: { message: `coords must be 2–${MAX_STOPS} lng,lat pairs` } }, { status: 400 });
  const key = points.map((p) => p.join(",")).join(";");

  let route = cache.get(key);
  if (!route) {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${key}?overview=full&geometries=geojson&steps=false`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`OSRM ${response.status}`);
      const data: { code?: string; routes?: { geometry?: { coordinates?: [number, number][] } }[] } = await response.json();
      const coordinates = data.routes?.[0]?.geometry?.coordinates ?? [];
      if (data.code !== "Ok" || coordinates.length < 2) throw new Error("No street route");
      route = coordinates.map(([lng, lat]) => [lat, lng]);
      if (cache.size >= 200) cache.delete(cache.keys().next().value!);
      cache.set(key, route);
    } catch {
      return Response.json({ error: { message: "Street routing unavailable" } }, { status: 502 });
    }
  }
  return Response.json({ points: route }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
