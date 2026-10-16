import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllGlobals());

describe("OSRM geometry", () => {
  const invalid = [ [[0, 0], [181, 0]], [[0, 0], [0, 91]], [[0, 0], [1]], [[0, 0], ["1", 2]], [[0, 0], [1, 2, 3]], [[0, 0], null] ];
  it.each(invalid.map((coordinates, i) => ({ coordinates, i })))("rejects invalid geometry $i and retries instead of caching it", async ({ coordinates, i }) => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ code: "Ok", routes: [{ geometry: { coordinates } }] })).mockResolvedValueOnce(Response.json({ code: "Ok", routes: [{ geometry: { coordinates: [[0, 0], [1, 2]] } }] }));
    vi.stubGlobal("fetch", fetch);
    const request = () => new Request(`http://localhost/api/street-route?coords=10,20;${30 + i},40`);
    expect((await GET(request())).status).toBe(502);
    const retry = await GET(request());
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ points: [[0, 0], [2, 1]] });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
