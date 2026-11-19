import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localChatStorage } from "./chat-storage";

vi.mock("@openuidev/react-ui", () => ({}));

const data = new Map<string, string>();
beforeEach(() => {
  data.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("localChatStorage corrupted records", () => {
  it.each(["null", "{}", '"unexpected"', "42"])("recovers a non-array thread index %s", async (json) => {
    data.set("oiu:threads", json);
    const storage = localChatStorage();
    expect(await storage.thread.listThreads()).toEqual({ threads: [] });
    const thread = await storage.thread.createThread({ id: "m", role: "user", content: "Hello" });
    expect((await storage.thread.listThreads()).threads).toEqual([thread]);
  });

  it("keeps valid threads and drops corrupt array entries", async () => {
    const thread = { id: "good", title: "Hello", createdAt: "2026-01-01T00:00:00.000Z" };
    data.set("oiu:threads", JSON.stringify([null, 7, {}, { id: "bad", title: {} }, thread]));
    const storage = localChatStorage();
    expect(await storage.thread.listThreads()).toEqual({ threads: [thread] });
    await storage.thread.deleteThread("good");
    expect(await storage.thread.listThreads()).toEqual({ threads: [] });
  });

  it.each(["null", "{}", '"unexpected"'])("returns an empty message list for %s", async (json) => {
    data.set("oiu:messages:t", json);
    expect(await localChatStorage().thread.getMessages("t")).toEqual([]);
  });
});
