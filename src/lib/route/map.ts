import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";

// Free OpenStreetMap vector tiles, no API key. Positron is a quiet light
// basemap, so the numbered pins and route line stay the focus.
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export type MapLibre = typeof import("maplibre-gl");

export async function loadMapLibre(): Promise<MapLibre> {
  const lib = await import("maplibre-gl");
  // MapLibre looks for its worker next to its own bundle, which Next's chunks
  // don't provide, so hand it the bundled worker file.
  lib.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
  return lib;
}

const ROUTE = "route";

// Adds an empty dashed line layer; call once the style has loaded.
export function addRouteLayer(map: MapLibreMap, color: string, opacity: number) {
  map.addSource(ROUTE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({
    id: ROUTE,
    type: "line",
    source: ROUTE,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": color, "line-width": 2.5, "line-opacity": opacity, "line-dasharray": [2, 2.8] },
  });
}

// Points are [lng, lat], the order MapLibre uses.
export function setRoute(map: MapLibreMap, points: [number, number][]) {
  (map.getSource(ROUTE) as GeoJSONSource | undefined)?.setData({
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: points.length > 1 ? points : [] },
  });
}

export function fitPoints(lib: MapLibre, map: MapLibreMap, points: [number, number][], maxZoom: number, animate: boolean) {
  if (!points.length) return;
  const bounds = points.reduce((b, p) => b.extend(p), new lib.LngLatBounds(points[0], points[0]));
  map.fitBounds(bounds, { padding: 48, maxZoom, animate });
}

// Turns an HTML pin into a focusable button-like marker.
export function addPin(
  lib: MapLibre,
  map: MapLibreMap,
  element: HTMLElement,
  point: [number, number],
  label: string,
  onSelect: () => void,
): Marker {
  element.title = label;
  element.setAttribute("aria-label", label);
  element.setAttribute("role", "button");
  element.tabIndex = 0;
  element.addEventListener("click", onSelect);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  });
  return new lib.Marker({ element }).setLngLat(point).addTo(map);
}
