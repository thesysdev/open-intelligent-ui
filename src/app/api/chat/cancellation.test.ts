import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({ default: class { responses = { create }; } }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("THESYS_API_KEY", "test-only");
  vi.stubEnv("LLM_BASE_URL", "");
  vi.stubEnv("OLLAMA_MODEL", "");
  vi.stubEnv("MODEL_PROVIDER", "");
  create.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

const request = () => new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }) });

describe("downstream stream lifetime", () => {
  it("aborts upstream work and closes its iterator when the reader cancels", async () => {
    let signal: AbortSignal;
    const close = vi.fn(async () => ({ done: true as const, value: undefined }));
    create.mockImplementation(async (_body, options) => {
      signal = options.signal;
      return { [Symbol.asyncIterator]() { return this; }, return: close, next: () => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }) };
    });
    const { POST } = await import("./route");
    const response = await POST(request());
    await response.body!.getReader().cancel("reader closed");
    expect(signal!.aborted).toBe(true);
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not eagerly drain all upstream events before the reader consumes them", async () => {
    let count = 0;
    const next = vi.fn(async () => count++ < 8 ? { done: false as const, value: { type: "response.output_text.delta", delta: String(count) } } : { done: true as const, value: undefined });
    create.mockResolvedValue({ [Symbol.asyncIterator]() { return this; }, next, return: async () => ({ done: true, value: undefined }) });
    const { POST } = await import("./route");
    const response = await POST(request());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(next.mock.calls.length).toBeLessThanOrEqual(1);
    await response.body!.cancel();
  });

  it("preserves successful SSE framing", async () => {
    create.mockResolvedValue((async function* () { yield { type: "response.output_text.delta", delta: "hello" }; yield { type: "response.completed" }; })());
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(await response.text()).toBe('data: {"type":"response.output_text.delta","delta":"hello"}\n\ndata: {"type":"response.completed"}\n\n');
  });
});
