import type { StyleSpecification } from "maplibre-gl";

export type MapLibre = typeof import("maplibre-gl");

/** Loads MapLibre on first use; Next emits its worker as a versioned same-origin asset. */
export async function loadMapLibre(): Promise<MapLibre> {
  const lib = await import("maplibre-gl");
  lib.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
  return lib;
}

/** Restrained, destination-independent cartography using public OpenMapTiles geometry. */
export const vectorStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: { places: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org">OpenFreeMap</a>' } },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#f4f2f0" } },
    { id: "landcover", type: "fill", source: "places", "source-layer": "landcover", filter: ["in", "class", "wood", "grass"], paint: { "fill-color": "#bce9b0", "fill-opacity": 0.8 } },
    { id: "parks", type: "fill", source: "places", "source-layer": "park", paint: { "fill-color": "#b7e7aa" } },
    { id: "school", type: "fill", source: "places", "source-layer": "landuse", filter: ["in", "class", "school", "university", "hospital"], paint: { "fill-color": "#ede8d7" } },
    { id: "water", type: "fill", source: "places", "source-layer": "water", paint: { "fill-color": "#a2dff5" } },
    { id: "waterways", type: "line", source: "places", "source-layer": "waterway", paint: { "line-color": "#91d6ef", "line-width": 1 } },
    { id: "buildings", type: "fill", minzoom: 14, source: "places", "source-layer": "building", paint: { "fill-color": "#e9e6e2" } },
    { id: "streets", type: "line", source: "places", "source-layer": "transportation", filter: ["!in", "class", "rail", "transit", "ferry", "motorway", "trunk", "primary"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#cdd1d9", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.3, 12, 1.5, 14, 2.8, 17, 8] } },
    { id: "main-roads", type: "line", source: "places", "source-layer": "transportation", filter: ["in", "class", "motorway", "trunk", "primary"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#b1b9c8", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.7, 12, 3, 14, 5, 17, 12] } },
    { id: "ferries", type: "line", source: "places", "source-layer": "transportation", filter: ["==", "class", "ferry"], paint: { "line-color": "#89cfe9", "line-width": 0.8 } },
    { id: "neighborhood-labels", type: "symbol", source: "places", "source-layer": "place", minzoom: 10, maxzoom: 15, filter: ["in", "class", "suburb", "quarter", "neighbourhood"], layout: { "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-letter-spacing": 0.08, "text-transform": "uppercase", "text-max-width": 8 }, paint: { "text-color": "#687078", "text-halo-color": "#fff", "text-halo-width": 1.2 } },
    { id: "city-labels", type: "symbol", source: "places", "source-layer": "place", minzoom: 7, maxzoom: 13, filter: ["in", "class", "city", "town"], layout: { "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": 14, "text-max-width": 8 }, paint: { "text-color": "#50545a", "text-halo-color": "#fff", "text-halo-width": 1.5 } },
  ],
};

/** Raster street tiles, used only if the vector basemap fails to load. */
export const rasterStyle: StyleSpecification = {
  version: 8,
  sources: { streets: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 19, attribution: "Tiles © Esri — OpenStreetMap contributors" } },
  layers: [{ id: "streets", type: "raster", source: "streets" }],
};
