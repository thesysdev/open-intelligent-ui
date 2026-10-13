// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SegmentedControl } from "./controls";

const field = vi.hoisted(() => ({ value: "B", setValue: vi.fn() }));
vi.mock("@openuidev/react-lang", async (importOriginal) => ({
  ...await importOriginal<typeof import("@openuidev/react-lang")>(),
  useStateField: () => field,
}));
vi.mock("./glyph", () => ({ Glyph: () => null }));
let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  field.value = "B"; field.setValue.mockImplementation((value: string) => { field.value = value; });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(() => root.unmount()); host.remove(); vi.clearAllMocks(); });
const render = () => act(() => root.render(createElement(SegmentedControl.component, {
  props: { value: field.value as never, options: ["A", "B", "C"] }, statementId: "choice", renderNode: () => null,
})));
const key = (button: HTMLButtonElement, value: string) => act(() => button.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true })));

it("uses one tab stop, follows arrows, and wraps selection and focus", async () => {
  await render(); const buttons = Array.from(host.querySelectorAll("button"));
  expect(buttons.map((button) => button.tabIndex)).toEqual([-1, 0, -1]);
  buttons[1].focus(); await key(buttons[1], "ArrowRight");
  expect(field.value).toBe("C"); expect(document.activeElement).toBe(buttons[2]);
  await render(); await key(buttons[2], "ArrowRight");
  expect(field.value).toBe("A"); expect(document.activeElement).toBe(buttons[0]);
  await key(buttons[0], "ArrowLeft"); expect(field.value).toBe("C");
});

it("supports Home/End and leaves unrelated keys to the browser", async () => {
  await render(); const buttons = Array.from(host.querySelectorAll("button"));
  await key(buttons[1], "Home"); expect(field.value).toBe("A");
  await key(buttons[0], "End"); expect(field.value).toBe("C");
  field.setValue.mockClear(); await key(buttons[2], "Tab"); expect(field.setValue).not.toHaveBeenCalled();
});

it("makes the first option tabbable when no value is selected", async () => {
  field.value = ""; await render();
  expect(Array.from(host.querySelectorAll("button"), (button) => button.tabIndex)).toEqual([0, -1, -1]);
});
