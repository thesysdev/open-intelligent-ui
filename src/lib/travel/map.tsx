"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, LngLatBoundsLike, Map as MapLibreMap, Marker } from "maplibre-gl";
import { getStopKey, useRouteStore, type StopData } from "../route/store";
import { loadMapLibre, rasterStyle, vectorStyle, type MapLibre } from "./vector-basemap";

type Coordinate = { lat?: number; lng?: number };
export const coordinate = (input: unknown): [number, number] | null => {
  if (!input || typeof input !== "object") return null;
  const value = input as Coordinate;
  return typeof value.lat === "number" && typeof value.lng === "number" && Number.isFinite(value.lat) && Number.isFinite(value.lng) && Math.abs(value.lat) <= 90 && Math.abs(value.lng) <= 180
    ? [value.lat, value.lng] : null;
};
const streetRouteCache = new Map<string, [number, number][]>();

// Points are [lat, lng] throughout this file; MapLibre takes [lng, lat].
const lngLat = ([lat, lng]: [number, number]): [number, number] => [lng, lat];
const boundsOf = (points: [number, number][]): LngLatBoundsLike => {
  const lats = points.map((p) => p[0]); const lngs = points.map((p) => p[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
};
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ROUTE = "route";
const FRAME_PADDING = { top: 70, left: 42, bottom: 50, right: 52 };
const FLY_MS = 920;
const DRAW_MS = 760;

function setLine(map: MapLibreMap, points: [number, number][]) {
  (map.getSource(ROUTE) as GeoJSONSource | undefined)?.setData({
    type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: points.map(lngLat) },
  });
}

// The first points of a line, cut at `progress` (0–1) of its length.
function partialLine(points: [number, number][], progress: number): [number, number][] {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let remaining = lengths.reduce((a, b) => a + b, 0) * progress;
  const out: [number, number][] = [points[0]];
  for (let i = 0; i < lengths.length; i++) {
    if (remaining >= lengths[i]) { out.push(points[i + 1]); remaining -= lengths[i]; continue; }
    const t = lengths[i] ? remaining / lengths[i] : 0;
    out.push([points[i][0] + (points[i + 1][0] - points[i][0]) * t, points[i][1] + (points[i + 1][1] - points[i][1]) * t]);
    break;
  }
  return out;
}

export function TravelMapView({ stops, path, streaming = false }: { stops: StopData[]; path?: Coordinate[]; streaming?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const fitSignature = useRef("");
  const markers = useRef(new Map<string, { marker: Marker; element: HTMLDivElement; pin: HTMLSpanElement; label: HTMLSpanElement }>());
  const linePoints = useRef<[number, number][]>([]);
  const lineDrawn = useRef(false);
  const anchored = useRef(false);
  const userMoved = useRef(false);
  const expandedNow = useRef(false);
  const [framedKey, setFramedKey] = useState("");
  const fitPoints = useRef<[number, number][]>([]);
  const [lib, setLib] = useState<MapLibre | null>(null);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [group, setGroup] = useState("all");
  const [infoOpen, setInfoOpen] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [streetRoute, setStreetRoute] = useState<{ key: string; points: [number, number][] | null } | null>(null);
  const route = useRouteStore();
  const selected = route.getSelected();
  const version = route.getSnapshot();
  // Emoji follows both coordinates in the schema, so its presence marks complete
  // coordinate tokens. Numeric prefixes such as -1 / -12 must not move the map.
  const readyStops = stops.filter((stop) => stop.name && coordinate(stop) && (!streaming || !!stop.emoji));
  const categories = Array.from(new Set(stops.map((stop) => stop.category).filter((item): item is string => !!item)));
  const stopSignature = JSON.stringify(readyStops.map((stop) => [getStopKey(stop), stop.name, stop.lat, stop.lng, stop.emoji, stop.category]));
  const pathSignature = JSON.stringify(path ?? []);
  const activePositions = readyStops.filter((stop) => stop.name && !route.isRemoved(getStopKey(stop)) && (group === "all" || stop.category === group)).map(coordinate).filter((point): point is [number, number] => !!point);
  const routingKey = activePositions.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const suppliedPath = group === "all" && Array.isArray(path) && path.filter(coordinate).length > 1;
  const streetPoints = streetRoute?.key === routingKey ? streetRoute.points : streetRouteCache.get(routingKey);
  const routeKind = suppliedPath ? "supplied" : streetPoints?.length ? "street" : streetRoute?.key === routingKey && streetRoute.points === null ? "overview" : "loading";

  // Street geometry loads in the background; the answer never waits for a map service.
  // Public OSRM's driving profile is a road overview, not mixed-mode travel guidance.
  useEffect(() => {
    if (suppliedPath || activePositions.length < 2 || streetRouteCache.has(routingKey)) return;
    const controller = new AbortController();
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const debounce = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${routingKey}?overview=full&geometries=geojson&steps=false`, { signal: controller.signal });
        if (!response.ok) throw new Error("Route service unavailable");
        const data: { code?: string; routes?: { geometry?: { coordinates?: unknown[] } }[] } = await response.json();
        const points = (data.routes?.[0]?.geometry?.coordinates ?? []).flatMap((point) => {
          if (!Array.isArray(point)) return [];
          const result = coordinate({ lat: point[1], lng: point[0] });
          return result ? [result] : [];
        });
        if (data.code !== "Ok" || points.length < 2) throw new Error("No street route available");
        if (streetRouteCache.size >= 64) streetRouteCache.delete(streetRouteCache.keys().next().value!);
        streetRouteCache.set(routingKey, points);
        if (active) setStreetRoute({ key: routingKey, points });
      } catch {
        if (active) setStreetRoute({ key: routingKey, points: null });
      } finally { clearTimeout(timeout); }
    }, 700);
    return () => { active = false; clearTimeout(debounce); clearTimeout(timeout); controller.abort(); };
    // Coordinates are the complete routing dependency; streaming object identities are not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routingKey, suppliedPath]);

  useEffect(() => {
    let active = true;
    loadMapLibre().then((module) => { if (active) setLib(module); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!lib || !surface.current) return;
    // Zoom levels are one lower than Leaflet's: MapLibre uses 512px tiles.
    const instance = new lib.Map({
      container: surface.current, style: vectorStyle, center: [0, 20], zoom: 1, minZoom: 0,
      scrollZoom: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, attributionControl: false,
    });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new lib.AttributionControl({ compact: false }), "bottom-left");
    instance.addControl(new lib.NavigationControl({ showCompass: false }), "bottom-right");
    let fellBack = false;
    // Re-adds the route line whenever a style (vector or fallback) finishes loading.
    instance.on("style.load", () => {
      if (!instance.getSource(ROUTE)) instance.addSource(ROUTE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      if (!instance.getLayer(ROUTE)) instance.addLayer({ id: ROUTE, type: "line", source: ROUTE, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#272727", "line-width": 3.2 } });
      setLine(instance, linePoints.current);
      if (!fellBack && container.current) container.current.dataset.basemapReady = "true";
      setReady(true);
    });
    // Fall back to raster tiles if the vector style or its tile source fails.
    instance.on("error", (event) => {
      if (fellBack) { setMapError(true); return; }
      const source = (event as { sourceId?: string }).sourceId;
      if (source && source !== "places") return;
      fellBack = true;
      instance.setStyle(rasterStyle);
    });
    instance.on("sourcedata", (event) => { if (fellBack && event.isSourceLoaded) setMapError(false); });
    instance.on("dragstart", () => { userMoved.current = true; });
    map.current = instance;
    const markerEntries = markers.current;
    // A resize must never reframe the camera during streaming or user panning.
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(surface.current);
    return () => {
      observer.disconnect(); markerEntries.forEach((entry) => entry.marker.remove()); markerEntries.clear();
      instance.remove(); map.current = null; fitSignature.current = ""; lineDrawn.current = false; anchored.current = false; setReady(false);
    };
  }, [lib]);

  useEffect(() => { expandedNow.current = expanded; }, [expanded]);

  useEffect(() => {
    if (!lib || !ready || !map.current) return;
    const instance = map.current;
    const visible = readyStops.filter((stop) => !route.isRemoved(getStopKey(stop)) && (group === "all" || stop.category === group));
    const keys = new Set(visible.map(getStopKey));
    for (const [key, entry] of markers.current) {
      if (!keys.has(key)) { entry.marker.remove(); markers.current.delete(key); }
    }
    visible.forEach((stop) => {
      const key = getStopKey(stop);
      let entry = markers.current.get(key);
      if (!entry) {
        const element = document.createElement("div");
        element.className = "tv-map-marker";
        element.tabIndex = 0;
        element.setAttribute("role", "button");
        const content = document.createElement("div");
        content.className = "tv-map-marker-content";
        const pin = document.createElement("span");
        pin.className = "tv-map-pin";
        const label = document.createElement("span");
        label.className = "tv-map-label";
        content.append(pin, label);
        element.append(content);
        const select = () => {
          route.selectStop(key);
          const wasExpanded = expandedNow.current;
          if (wasExpanded) setExpanded(false);
          window.setTimeout(() => document.getElementById(route.stopId(key))?.scrollIntoView({ behavior: "smooth", block: "center" }), wasExpanded ? 80 : 0);
        };
        element.addEventListener("click", select);
        element.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } });
        // Anchor the pin's centre (not the label below it) on the coordinate.
        const marker = new lib.Marker({ element, anchor: "top", offset: [0, -17] }).setLngLat(lngLat(coordinate(stop)!)).addTo(instance);
        entry = { marker, element, pin, label };
        markers.current.set(key, entry);
      }
      entry.marker.setLngLat(lngLat(coordinate(stop)!));
      entry.element.style.zIndex = selected === key ? "2" : "";
      entry.element.title = stop.name || "";
      entry.element.setAttribute("aria-label", stop.name || "");
      entry.pin.classList.toggle("is-selected", selected === key);
      entry.pin.textContent = stop.emoji || "📍";
      entry.label.textContent = stop.name || "";
    });
    const positions = visible.map((stop) => coordinate(stop)!);
    fitPoints.current = positions;
    if (container.current) {
      container.current.dataset.markerCount = String(positions.length);
      if (streaming) container.current.dataset.revealState = "pins";
    }
    if (positions.length && !anchored.current) {
      // Begin with a steady city overview; subsequent points do not move the camera.
      instance.jumpTo({ center: lngLat(positions[0]), zoom: 10.5 });
      anchored.current = true;
    }
    // Object identities change each token. Reconcile completed primitive values only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib, ready, stopSignature, group, selected, version]);

  useEffect(() => {
    if (!ready || !map.current || streaming || !fitPoints.current.length) return;
    const instance = map.current;
    const nextFit = JSON.stringify([group, routingKey]);
    if (fitSignature.current === nextFit) return;
    fitSignature.current = nextFit;
    // A filter change must not keep displaying the previous group's route.
    linePoints.current = []; setLine(instance, []);
    if (container.current) container.current.dataset.revealState = "framing";
    const finish = () => { setFramedKey(routingKey); };
    if (userMoved.current || reducedMotion()) {
      if (!userMoved.current) instance.fitBounds(boundsOf(fitPoints.current), { padding: FRAME_PADDING, maxZoom: 12.2, animate: false });
      finish();
      return;
    }
    instance.fitBounds(boundsOf(fitPoints.current), { padding: FRAME_PADDING, maxZoom: 12.2, duration: FLY_MS, linear: false });
    // fitBounds may not emit moveend when the viewport already matches.
    const timer = window.setTimeout(finish, FLY_MS + 40);
    return () => clearTimeout(timer);
  }, [ready, streaming, routingKey, group]);

  useEffect(() => {
    if (!ready || !map.current || streaming || framedKey !== routingKey) return;
    const instance = map.current;
    const positions = suppliedPath && Array.isArray(path)
      ? path.map(coordinate).filter((point): point is [number, number] => !!point)
      : streetPoints?.length ? streetPoints : fitPoints.current;
    if (positions.length < 2) {
      linePoints.current = []; setLine(instance, []);
      if (container.current) container.current.dataset.revealState = "ready";
      return;
    }
    linePoints.current = positions;
    // Geometry changes after the first draw update the line in place.
    if (lineDrawn.current || reducedMotion()) {
      lineDrawn.current = true;
      setLine(instance, positions);
      if (container.current) container.current.dataset.revealState = "ready";
      return;
    }
    if (container.current) container.current.dataset.revealState = "drawing";
    const start = performance.now();
    let frame = requestAnimationFrame(function draw(now) {
      const t = Math.min(1, (now - start) / DRAW_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      setLine(instance, partialLine(positions, eased));
      if (t < 1) { frame = requestAnimationFrame(draw); return; }
      lineDrawn.current = true;
      if (container.current) container.current.dataset.revealState = "ready";
    });
    return () => { cancelAnimationFrame(frame); setLine(instance, linePoints.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, framedKey, routingKey, pathSignature, streetRoute, suppliedPath, streaming]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => map.current?.resize());
    return () => cancelAnimationFrame(frame);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    container.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setExpanded(false); return; }
      if (event.key !== "Tab" || !container.current) return;
      const elements = Array.from(container.current.querySelectorAll<HTMLElement>('button,select,a[href],[tabindex="0"]')).filter((item) => item.offsetParent !== null);
      const first = elements[0]; const last = elements[elements.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === container.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [expanded]);

  return <div className="tv-map-slot" id={`${route.mapId}-travel`}>
    <div ref={container} className={`tv-map-wrap${expanded ? " is-expanded" : ""}`} role={expanded ? "dialog" : "region"} aria-modal={expanded || undefined} aria-label="Sightseeing route map" data-route-kind={routeKind} data-streaming={streaming} tabIndex={expanded ? -1 : undefined}>
      <div className="tv-map-surface" ref={surface} />
      <div className="tv-map-top-left">
        <label className="tv-map-pill tv-map-filter">
          <select aria-label="Filter map groups" value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="all">All groups</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
        </label>
        <button className="tv-map-pill tv-map-recenter" type="button" aria-label="Show entire route" onClick={() => {
          if (fitPoints.current.length) map.current?.fitBounds(boundsOf(fitPoints.current), { padding: { top: 55, left: 34, bottom: 35, right: 40 }, maxZoom: 14 });
        }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m4.5 4.5 15 5a1 1 0 0 1 0 1.9l-6.1 2-2 6.1a1 1 0 0 1-1.9 0l-5-15z"/></svg></button>
        <button className="tv-map-info" type="button" aria-label="About this map" aria-expanded={infoOpen} onClick={() => setInfoOpen(!infoOpen)}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 9v5"/><circle cx="10" cy="6.3" r=".6" fill="currentColor" stroke="none"/></svg></button>
      </div>
      <button className="tv-map-pill tv-map-expand" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Collapse" : "Expand"}<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 4h4v4M8 16H4v-4M16 12v4h-4M4 8V4h4"/></svg></button>
      {infoOpen && <div className="tv-map-note">Drag to explore. Use + and − to zoom, and select a place to see its itinerary details. {routeKind === "supplied" ? "The line shows the supplied sightseeing route." : routeKind === "street" ? "Street geometry by OSRM / OpenStreetMap. This road overview is not turn-by-turn or mixed-mode travel guidance." : "The line connects stops in visiting order. Street routing is unavailable or still loading; this is a route overview, not turn-by-turn directions."}</div>}
      {routeKind === "overview" && <div className="tv-map-overview" title="Street routing is unavailable. The line connects stops directly.">Route overview</div>}
      <span className="tv-map-status" role="status">{routeKind === "street" ? "Street route loaded." : routeKind === "supplied" ? "Supplied route shown." : routeKind === "overview" ? "Street routing unavailable. Showing direct connections between stops." : "Street route loading. Showing direct connections between stops."}</span>
      {mapError && <div className="tv-map-error" role="status">Map tiles are temporarily unavailable. Your stops and route are still shown.</div>}
    </div>
  </div>;
}
