// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Input } from "./controls";

const field = vi.hoisted(() => ({ value: 3 as number | null, setValue: vi.fn() }));
vi.mock("@openuidev/react-lang", async (importOriginal) => ({
  ...await importOriginal<typeof import("@openuidev/react-lang")>(),
  useStateField: () => field,
}));
vi.mock("./glyph", () => ({ Glyph: () => null }));

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  field.value = 3;
  field.setValue.mockImplementation((value: number | null) => { field.value = value; });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(() => root.unmount()); host.remove(); vi.clearAllMocks(); });

const render = () => act(() => root.render(createElement(Input.component, {
  props: { value: field.value as never, type: "number", label: "Amount" },
  statementId: "amount", renderNode: () => null,
})));
const type = (input: HTMLInputElement, text: string) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, text);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

it("preserves a user's partial number but shows an external reset immediately", async () => {
  await render(); const input = host.querySelector("input")!;
  await type(input, "12.");
  expect(input.value).toBe("12."); expect(field.value).toBe(12);
  field.value = 0; await render();
  expect(input.value).toBe("0");
  field.value = 12; await render();
  expect(input.value).toBe("12");
});

it("retains an unparseable draft until an external update", async () => {
  await render(); const input = host.querySelector("input")!;
  await type(input, "-");
  expect(input.value).toBe("-"); expect(field.value).toBe(3);
  field.value = 5; await render(); expect(input.value).toBe("5");
});
