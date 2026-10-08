"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { getStopKey, useRouteStore, type StopData } from "../route/store";
import { boundsOf, coordinate, createPinElement, lngLat, partialLine, pinEmoji, reducedMotion, type LatLng } from "./map-utils";
import { useDialog } from "./use-dialog";
import { useStreetRoute } from "./use-street-route";
import { loadMapLibre, rasterStyle, vectorStyle, type MapLibre } from "./vector-basemap";

const ROUTE = "route";
const FRAME_PADDING = { top: 70, left: 42, bottom: 50, right: 52 };
const FLY_MS = 920;
const DRAW_MS = 760;

function setLine(map: MapLibreMap, points: LatLng[]) {
  (map.getSource(ROUTE) as GeoJSONSource | undefined)?.setData({
    type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: points.map(lngLat) },
  });
}

export function TravelMapView({ stops, path, streaming = false }: { stops: StopData[]; path?: { lat?: number; lng?: number }[]; streaming?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; element: HTMLDivElement; pin: HTMLSpanElement; label: HTMLSpanElement }>());
  const fitPoints = useRef<LatLng[]>([]);
  const fitSignature = useRef("");
  const linePoints = useRef<LatLng[]>([]);
  const lineDrawn = useRef(false);
  const anchored = useRef(false);
  const userMoved = useRef(false);
  const expandedNow = useRef(false);
  const [lib, setLib] = useState<MapLibre | null>(null);
  const [ready, setReady] = useState(false);
  const [framedKey, setFramedKey] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [group, setGroup] = useState("all");
  const [infoOpen, setInfoOpen] = useState(false);
  const [mapError, setMapError] = useState(false);
  const route = useRouteStore();
  const selected = route.getSelected();
  const version = route.getSnapshot();

  // Emoji follows both coordinates in the schema, so its presence marks complete
  // coordinate tokens. Numeric prefixes such as -1 / -12 must not move the map.
  const readyStops = stops.filter((stop) => stop.name && coordinate(stop) && (!streaming || !!stop.emoji));
  const visibleStops = readyStops.filter((stop) => !route.isRemoved(getStopKey(stop)) && (group === "all" || stop.category === group));
  const categories = Array.from(new Set(stops.map((stop) => stop.category).filter((item): item is string => !!item)));
  const stopSignature = JSON.stringify(readyStops.map((stop) => [getStopKey(stop), stop.name, stop.lat, stop.lng, stop.emoji, stop.category]));
  const routingKey = visibleStops.map((stop) => lngLat(coordinate(stop)!).join(",")).join(";");
  const pathSignature = JSON.stringify(path ?? []);
  const suppliedPath = group === "all" && Array.isArray(path) && path.filter(coordinate).length > 1;
  const streetPoints = useStreetRoute(routingKey, !suppliedPath);
  const routeKind = suppliedPath ? "supplied" : streetPoints?.length ? "street" : streetPoints === null ? "overview" : "loading";
  useDialog(container, expanded, () => setExpanded(false));

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

  // Reconcile pins with the visible stops; existing pins update in place.
  useEffect(() => {
    if (!lib || !ready || !map.current) return;
    const keys = new Set(visibleStops.map(getStopKey));
    for (const [key, entry] of markers.current) {
      if (!keys.has(key)) { entry.marker.remove(); markers.current.delete(key); }
    }
    visibleStops.forEach((stop) => {
      const key = getStopKey(stop);
      let entry = markers.current.get(key);
      if (!entry) {
        const pinElement = createPinElement(() => {
          route.selectStop(key);
          const wasExpanded = expandedNow.current;
          if (wasExpanded) setExpanded(false);
          window.setTimeout(() => document.getElementById(route.stopId(key))?.scrollIntoView({ behavior: "smooth", block: "center" }), wasExpanded ? 80 : 0);
        });
        // Anchor the pin's centre (not the label below it) on the coordinate.
        const marker = new lib.Marker({ element: pinElement.element, anchor: "top", offset: [0, -17] }).setLngLat(lngLat(coordinate(stop)!)).addTo(map.current!);
        entry = { marker, ...pinElement };
        markers.current.set(key, entry);
      }
      entry.marker.setLngLat(lngLat(coordinate(stop)!));
      entry.element.style.zIndex = selected === key ? "2" : "";
      entry.element.title = stop.name || "";
      entry.element.setAttribute("aria-label", stop.name || "");
      entry.pin.classList.toggle("is-selected", selected === key);
      entry.pin.textContent = pinEmoji(stop.emoji);
      entry.label.textContent = stop.name || "";
    });
    fitPoints.current = visibleStops.map((stop) => coordinate(stop)!);
    if (fitPoints.current.length && !anchored.current) {
      // Begin with a steady city overview; subsequent points do not move the camera.
      map.current.jumpTo({ center: lngLat(fitPoints.current[0]), zoom: 10.5 });
      anchored.current = true;
    }
    // Object identities change each token. Reconcile completed primitive values only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib, ready, stopSignature, group, selected, version]);

  // Once streaming ends (or the filter changes), fly to fit the stops.
  useEffect(() => {
    if (!ready || !map.current || streaming || !fitPoints.current.length) return;
    const nextFit = JSON.stringify([group, routingKey]);
    if (fitSignature.current === nextFit) return;
    fitSignature.current = nextFit;
    // A filter change must not keep displaying the previous group's route.
    linePoints.current = []; setLine(map.current, []);
    if (userMoved.current || reducedMotion()) {
      if (!userMoved.current) map.current.fitBounds(boundsOf(fitPoints.current), { padding: FRAME_PADDING, maxZoom: 12.2, animate: false });
      setFramedKey(routingKey);
      return;
    }
    map.current.fitBounds(boundsOf(fitPoints.current), { padding: FRAME_PADDING, maxZoom: 12.2, duration: FLY_MS, linear: false });
    // fitBounds may not emit moveend when the viewport already matches.
    const timer = window.setTimeout(() => setFramedKey(routingKey), FLY_MS + 40);
    return () => clearTimeout(timer);
  }, [ready, streaming, routingKey, group]);

  // After framing, draw the route line once; later geometry changes update it in place.
  useEffect(() => {
    if (!ready || !map.current || streaming || framedKey !== routingKey) return;
    const instance = map.current;
    const positions = suppliedPath ? path!.map(coordinate).filter((point): point is LatLng => !!point) : streetPoints?.length ? streetPoints : fitPoints.current;
    linePoints.current = positions.length > 1 ? positions : [];
    if (positions.length < 2 || lineDrawn.current || reducedMotion()) {
      lineDrawn.current = positions.length > 1;
      setLine(instance, linePoints.current);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function draw(now) {
      const t = Math.min(1, (now - start) / DRAW_MS);
      setLine(instance, partialLine(positions, t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2));
      if (t < 1) frame = requestAnimationFrame(draw);
      else lineDrawn.current = true;
    });
    return () => { cancelAnimationFrame(frame); setLine(instance, linePoints.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, framedKey, routingKey, pathSignature, streetPoints, suppliedPath, streaming]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => map.current?.resize());
    return () => cancelAnimationFrame(frame);
  }, [expanded]);

  const routeNote = routeKind === "supplied" ? "The line shows the supplied sightseeing route."
    : routeKind === "street" ? "Street geometry by OSRM / OpenStreetMap. This road overview is not turn-by-turn or mixed-mode travel guidance."
    : "The line connects stops in visiting order. Street routing is unavailable or still loading; this is a route overview, not turn-by-turn directions.";
  const routeStatus = { street: "Street route loaded.", supplied: "Supplied route shown.", overview: "Street routing unavailable. Showing direct connections between stops.", loading: "Street route loading. Showing direct connections between stops." }[routeKind];

  return <div className="tv-map-slot" id={`${route.mapId}-travel`}>
    <div ref={container} className={`tv-map-wrap${expanded ? " is-expanded" : ""}`} role={expanded ? "dialog" : "region"} aria-modal={expanded || undefined} aria-label="Sightseeing route map" tabIndex={expanded ? -1 : undefined}>
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
      {infoOpen && <div className="tv-map-note">Drag to explore. Use + and − to zoom, and select a place to see its itinerary details. {routeNote}</div>}
      {routeKind === "overview" && <div className="tv-map-overview" title="Street routing is unavailable. The line connects stops directly.">Route overview</div>}
      <span className="tv-map-status" role="status">{routeStatus}</span>
      {mapError && <div className="tv-map-error" role="status">Map tiles are temporarily unavailable. Your stops and route are still shown.</div>}
    </div>
  </div>;
}
