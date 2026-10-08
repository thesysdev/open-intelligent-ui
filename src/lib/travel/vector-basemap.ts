import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import type { Map as LeafletMap } from "leaflet";

// Next emits a versioned same-origin worker. No hosted executable or API key.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

/** Restrained, destination-independent cartography using public OpenMapTiles geometry. */
const style: StyleSpecification = {
  version: 8,
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
  ],
};

export function addVectorBasemap(map: LeafletMap) {
  return maplibreGL({ style, attributionControl: false }).addTo(map);
}
