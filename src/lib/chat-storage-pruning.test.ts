import { afterEach, describe, expect, it, vi } from "vitest";
import { localChatStorage } from "./chat-storage";

vi.mock("@openuidev/react-ui", () => ({}));
afterEach(() => vi.unstubAllGlobals());

describe("localChatStorage thread eviction", () => {
  const threads = Array.from({ length: 50 }, (_, i) => ({ id: String(i), title: "Existing chat", createdAt: "2026-01-01" }));

  it("still creates a chat when old messages cannot be removed", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify(threads),
      removeItem: () => { throw new DOMException("Storage denied", "SecurityError"); },
      setItem: () => { throw new DOMException("Storage denied", "SecurityError"); },
    });
    await expect(localChatStorage().thread.createThread({ id: "m", role: "user", content: "Hello" })).resolves.toMatchObject({ title: "Hello" });
  });

  it("removes the oldest thread's messages and caps the saved index", async () => {
    const values = new Map([["oiu:threads", JSON.stringify(threads)], ["oiu:messages:49", "[]"]]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    await localChatStorage().thread.createThread({ id: "m", role: "user", content: "Hello" });
    expect(values.has("oiu:messages:49")).toBe(false);
    expect(JSON.parse(values.get("oiu:threads")!)).toHaveLength(50);
  });
});
