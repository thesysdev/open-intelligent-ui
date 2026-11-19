// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { MapView } from "./map";

vi.mock("@openuidev/react-lang", async (importOriginal) => ({
  ...await importOriginal<typeof import("@openuidev/react-lang")>(),
  useIsStreaming: () => false, useStateField: () => ({ value: "", setValue: vi.fn() }),
}));
vi.mock("../scheme", () => ({ useColorScheme: () => "light" }));
vi.mock("./use-street-route", () => ({ useStreetRoute: () => undefined }));
vi.mock("./basemap", () => {
  class FakeMap {
    container: HTMLElement;
    touchZoomRotate = { disableRotation() {} };
    constructor(options: { container: HTMLElement }) { this.container = options.container; }
    on(event: string, callback: () => void) { if (event === "style.load") queueMicrotask(callback); }
    addControl() {} getSource() { return { setData() {} }; } getLayer() { return {}; }
    jumpTo() {} fitBounds() {} resize() {} remove() {} setStyle() {}
  }
  class FakeMarker {
    element: HTMLElement;
    constructor(options: { element: HTMLElement }) { this.element = options.element; }
    setLngLat() { return this; }
    addTo(map: FakeMap) { map.container.append(this.element); return this; }
    remove() { this.element.remove(); }
  }
  return { loadMapLibre: async () => ({ Map: FakeMap, Marker: FakeMarker, AttributionControl: class {}, NavigationControl: class {} }), vectorStyle: () => ({}), rasterStyle: () => ({}) };
});

const marker = (label: string, category: string) => ({ type: "element", props: { label, category, lat: 37, lng: -122 } });

it("shows the remaining places when the selected category disappears", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("requestAnimationFrame", () => 0); vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const render = (markers: unknown[]) => act(async () => root.render(createElement(MapView.component, {
    props: { markers: markers as never, route: true, selected: undefined as never }, statementId: "map", renderNode: () => null,
  })));
  try {
    await render([marker("Garden", "Parks"), marker("Museum", "Museums")]);
    const filter = host.querySelector("select")!;
    await act(() => { filter.value = "Parks"; filter.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(Array.from(host.querySelectorAll(".iui-map-marker"), (pin) => pin.getAttribute("aria-label"))).toEqual(["Garden"]);
    await render([marker("Museum", "Museums")]);
    expect(Array.from(host.querySelectorAll(".iui-map-marker"), (pin) => pin.getAttribute("aria-label"))).toEqual(["Museum"]);
    await render([marker("New garden", "Parks"), marker("Museum", "Museums")]);
    expect(host.querySelector("select")!.value).toBe("all");
    expect(host.querySelectorAll(".iui-map-marker")).toHaveLength(2);
  } finally {
    await act(() => root.unmount()); host.remove(); vi.unstubAllGlobals();
  }
});
