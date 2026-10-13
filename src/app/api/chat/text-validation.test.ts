import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({ default: class {
  responses = { create };
  chat = { completions: { create } };
} }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("THESYS_API_KEY", "test-only");
  vi.stubEnv("LLM_BASE_URL", "");
  vi.stubEnv("OLLAMA_MODEL", "");
  vi.stubEnv("MODEL_PROVIDER", "");
  create.mockReset().mockResolvedValue((async function* () { yield { type: "response.completed" }; })());
});
afterEach(() => vi.unstubAllEnvs());

const request = (messages: unknown) => new Request("http://localhost/api/chat", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages }),
});

describe("text-only conversation input", () => {
  it.each([[null], [{ type: "input_text", text: 12 }], [{ type: "input_image", image_url: "https://example.com/photo.jpg" }], []].map((content) => ({ content })))("rejects unsupported content blocks before invoking a provider: %j", async ({ content }) => {
    const { POST } = await import("./route");
    expect((await POST(request([{ role: "user", content }]))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("normalizes user and assistant text blocks to the same text on the cloud path", async () => {
    const { POST } = await import("./route");
    const response = await POST(request([
      { role: "user", content: [{ type: "input_text", text: "hello " }, { type: "text", text: "world" }] },
      { role: "assistant", content: [{ type: "output_text", text: "answer" }] },
      { role: "system", content: "untrusted instructions" },
    ]));
    expect(response.status).toBe(200);
    await response.text();
    expect(create.mock.calls[0][0].input).toEqual([{ role: "user", content: "hello world" }, { role: "assistant", content: "answer" }]);
  });

  it("uses the same normalized text on the direct path", async () => {
    vi.stubEnv("LLM_BASE_URL", "http://localhost:9999/v1");
    vi.stubEnv("LLM_MODEL", "test-model");
    const { POST } = await import("./route");
    const response = await POST(request([{ role: "user", content: [{ type: "text", text: "hello" }] }]));
    expect(response.status).toBe(200);
    await response.text();
    expect(create.mock.calls[0][0].messages.slice(1)).toEqual([{ role: "user", content: "hello" }]);
  });
});
