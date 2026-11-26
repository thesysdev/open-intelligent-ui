import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllGlobals());

describe("Wikipedia subject matching", () => {
  it.each(["Pho", "Tea", "Rio", "Taj", "Té"])("keeps matching lead photos for the short subject %s", async (q) => {
    const photo = `https://images.example/${encodeURIComponent(q)}.jpg`;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json({ query: { pages: url.startsWith("https://en.wikipedia.org/") ? [{ title: q, thumbnail: { source: photo } }] : [] } })));
    const response = await GET(new Request(`http://localhost/api/image-search?q=${encodeURIComponent(q)}`));
    expect(response.status).toBe(200);
    expect((await response.json()).images).toContain(photo);
  });

  it("does not use common connecting words as a subject match", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ query: { pages: [{ title: "History of photography", thumbnail: { source: "https://images.example/unrelated.jpg" } }] } })));
    const response = await GET(new Request("http://localhost/api/image-search?q=cup+of+tea"));
    expect((await response.json()).images).toEqual([]);
  });
});
