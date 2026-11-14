import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllGlobals());

it("keeps a lead photo whose file name contains map, flag or icon inside a word", async () => {
  const photo = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Chen_Mapo_Tofu.jpg/960px-Chen_Mapo_Tofu.jpg";
  const flag = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Flag_of_China.svg/960px-Flag_of_China.svg.png";
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    Response.json({ query: { pages: url.startsWith("https://en.wikipedia.org/") ? [{ title: "Mapo tofu", thumbnail: { source: photo } }, { title: "Mapo tofu flag", thumbnail: { source: flag } }] : [] } }),
  ));
  const response = await GET(new Request("http://localhost/api/image-search?q=Mapo+tofu"));
  expect((await response.json()).images).toEqual([photo]);
});
