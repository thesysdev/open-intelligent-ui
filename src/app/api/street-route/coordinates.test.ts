import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllGlobals());

describe("street route coordinates", () => {
  it.each([",;1,2", "1,;2,3", " ,2;3,4", "1,2,3;4,5", "Infinity,2;3,4", "181,0;1,2", "0,91;1,2", "1;2,3", "1,2;"])("rejects incomplete or invalid pair %s before fetching", async (coords) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await GET(new Request(`http://localhost/api/street-route?coords=${encodeURIComponent(coords)}`));
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts zero, signed and fractional coordinates", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ code: "Ok", routes: [{ geometry: { coordinates: [[0, 0], [-73.5, 40.5]] } }] }));
    vi.stubGlobal("fetch", fetch);
    const response = await GET(new Request("http://localhost/api/street-route?coords=0,0;-73.5,40.5"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ points: [[0, 0], [40.5, -73.5]] });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
