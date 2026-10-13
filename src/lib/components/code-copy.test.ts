// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Code } from "./extra";

let root: Root;
let host: HTMLDivElement;
const writeText = vi.fn();
beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); writeText.mockReset();
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(() => root.render(createElement(Code.component, { props: { code: "const a = 1;" }, renderNode: () => null })));
});
afterEach(async () => { await act(() => root.unmount()); host.remove(); vi.useRealTimers(); });

it("handles denied clipboard access and gives a manual-copy fallback", async () => {
  writeText.mockRejectedValue(new DOMException("Permission denied", "NotAllowedError"));
  await act(async () => { host.querySelector("button")!.click(); });
  expect(host.querySelector('[role="status"]')!.textContent).toContain("Select and copy it manually");
  expect(host.querySelector("button")!.textContent).toBe("Copy");
});

it("handles a browser without the clipboard API", async () => {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  await act(async () => { host.querySelector("button")!.click(); });
  expect(host.querySelector('[role="status"]')).not.toBeNull();
});

it("copies the exact text and retains feedback for 1500ms after the latest copy", async () => {
  writeText.mockResolvedValue(undefined);
  await act(async () => { host.querySelector("button")!.click(); });
  expect(writeText).toHaveBeenCalledWith("const a = 1;");
  await act(() => vi.advanceTimersByTime(1000));
  await act(async () => { host.querySelector("button")!.click(); });
  await act(() => vi.advanceTimersByTime(600));
  expect(host.querySelector("button")!.textContent).toBe("Copied");
  await act(() => vi.advanceTimersByTime(900));
  expect(host.querySelector("button")!.textContent).toBe("Copy");
});
