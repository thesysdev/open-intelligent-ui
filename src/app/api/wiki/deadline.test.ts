import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Wikipedia request lifetime", () => {
  it("applies a shared deadline to both lookups", async () => {
    const deadline = vi.spyOn(AbortSignal, "timeout");
    const fetch = vi.fn(async (_url: string, _options: RequestInit) => Response.json({}));
    vi.stubGlobal("fetch", fetch);
    expect((await GET(new Request("http://localhost/api/wiki?title=Deadline+test"))).status).toBe(200);
    expect(deadline).toHaveBeenCalledWith(8000);
    expect(fetch).toHaveBeenCalledTimes(2);
    const signals = fetch.mock.calls.map((call) => call[1].signal);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[1]).toBe(signals[0]);
  });

  it("propagates an already cancelled caller instead of continuing network work", async () => {
    const fetch = vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.signal?.aborted) throw options.signal.reason;
      return Response.json({});
    });
    vi.stubGlobal("fetch", fetch);
    const response = await GET(new Request("http://localhost/api/wiki?title=Cancelled+test", { signal: AbortSignal.abort() }));
    expect(response.status).toBe(502);
    expect(fetch.mock.calls.every((call) => call[1]?.signal?.aborted)).toBe(true);
  });
});
