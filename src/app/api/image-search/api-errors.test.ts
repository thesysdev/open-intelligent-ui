import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllGlobals());

describe("MediaWiki application errors", () => {
  it.each(["maxlag", "ratelimited", "internal_api_error_DBQueryError"])("returns an unavailable response for %s instead of caching an empty result", async (code) => {
    const photo = "https://images.example/recovered.jpg";
    const fetch = vi.fn(async () => Response.json({ query: { pages: [{ title: code, thumbnail: { source: photo } }] } }));
    fetch.mockImplementationOnce(async () => Response.json({ error: { code, info: "temporary provider error" } }));
    vi.stubGlobal("fetch", fetch);
    const request = () => new Request(`http://localhost/api/image-search?q=${code}`);
    expect((await GET(request())).status).toBe(502);
    const callsAfterFailure = fetch.mock.calls.length;
    const retry = await GET(request());
    expect(retry.status).toBe(200);
    expect((await retry.json()).images).toContain(photo);
    expect(fetch.mock.calls.length).toBeGreaterThan(callsAfterFailure);
  });

  it("preserves successful empty searches", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ query: { pages: [] } })));
    const response = await GET(new Request("http://localhost/api/image-search?q=Empty+results"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ images: [] });
  });
});
