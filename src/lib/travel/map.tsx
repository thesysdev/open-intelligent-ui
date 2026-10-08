"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { getStopKey, useRouteStore, type StopData } from "../route/store";

type Coordinate = { lat?: number; lng?: number };
const coordinate = (input: unknown): [number, number] | null => {
  if (!input || typeof input !== "object") return null;
  const value = input as Coordinate;
  return typeof value.lat === "number" && typeof value.lng === "number" && Number.isFinite(value.lat) && Number.isFinite(value.lng) && Math.abs(value.lat) <= 90 && Math.abs(value.lng) <= 180
    ? [value.lat, value.lng] : null;
};
const streetRouteCache = new Map<string, [number, number][]>();

export function TravelMapView({ stops, path }: { stops: StopData[]; path?: Coordinate[] }) {
  const container = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const fitSignature = useRef("");
  const fitPoints = useRef<[number, number][]>([]);
  const [leaflet, setLeaflet] = useState<typeof import("leaflet") | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [group, setGroup] = useState("all");
  const [infoOpen, setInfoOpen] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [streetRoute, setStreetRoute] = useState<{ key: string; points: [number, number][] | null } | null>(null);
  const route = useRouteStore();
  const selected = route.getSelected();
  const version = route.getSnapshot();
  const categories = Array.from(new Set(stops.map((stop) => stop.category).filter((item): item is string => !!item)));
  const stopSignature = JSON.stringify(stops.map((stop) => [getStopKey(stop), stop.name, stop.lat, stop.lng, stop.emoji, stop.category]));
  const pathSignature = JSON.stringify(path ?? []);
  const activePositions = stops.filter((stop) => stop.name && !route.isRemoved(getStopKey(stop)) && (group === "all" || stop.category === group)).map(coordinate).filter((point): point is [number, number] => !!point);
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
    import("leaflet").then((module) => { if (active) setLeaflet(module.default ?? module); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!leaflet || !surface.current) return;
    const instance = leaflet.map(surface.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false, keyboard: true, zoomSnap: 0.1, minZoom: 1 }).setView([20, 0], 2);
    instance.attributionControl.setPrefix(false);
    let active = true;
    let fallbackAdded = false;
    const fallback = () => {
      if (!active || fallbackAdded) return;
      fallbackAdded = true;
      leaflet.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles © Esri — OpenStreetMap contributors" }).on("tileerror", () => setMapError(true)).on("load", () => setMapError(false)).addTo(instance);
    };
    import("./vector-basemap").then(({ addVectorBasemap }) => {
      if (!active) return;
      try {
        const basemap = addVectorBasemap(instance);
        basemap.getMaplibreMap().on("error", fallback);
        basemap.getMaplibreMap().on("load", () => setMapError(false));
        instance.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org">OpenFreeMap</a>');
      } catch { fallback(); }
    }).catch(fallback);
    leaflet.control.zoom({ position: "bottomright" }).addTo(instance);
    layer.current = leaflet.layerGroup().addTo(instance);
    map.current = instance;
    const observer = new ResizeObserver(() => {
      instance.invalidateSize({ animate: false });
      if (fitPoints.current.length) instance.fitBounds(leaflet.latLngBounds(fitPoints.current), { paddingTopLeft: [34, 55], paddingBottomRight: [40, 35], maxZoom: 15, animate: false });
    });
    observer.observe(surface.current);
    return () => { active = false; observer.disconnect(); instance.remove(); map.current = null; layer.current = null; fitSignature.current = ""; };
  }, [leaflet]);

  useEffect(() => {
    if (!leaflet || !map.current || !layer.current) return;
    const instance = map.current;
    const routeLayer = layer.current;
    routeLayer.clearLayers();
    const visible = stops.filter((stop) => stop.name && coordinate(stop) && !route.isRemoved(getStopKey(stop)) && (group === "all" || stop.category === group));
    const positions = visible.map((stop) => coordinate(stop)!);
    fitPoints.current = positions;
    const routePositions = suppliedPath && Array.isArray(path)
      ? path.map(coordinate).filter((point): point is [number, number] => !!point)
      : streetPoints?.length ? streetPoints : positions;
    if (routePositions.length > 1) leaflet.polyline(routePositions, { color: "#272727", weight: 3.2, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }).addTo(routeLayer);
    visible.forEach((stop) => {
      const key = getStopKey(stop);
      const content = document.createElement("div");
      content.className = "tv-map-marker-content";
      const pin = document.createElement("span");
      pin.className = `tv-map-pin${selected === key ? " is-selected" : ""}`;
      pin.textContent = stop.emoji || "📍";
      content.append(pin);
      const label = document.createElement("span");
      label.className = "tv-map-label";
      label.textContent = stop.name || "";
      content.append(label);
      const icon = leaflet.divIcon({ className: "tv-map-marker", html: content, iconSize: [34, 34], iconAnchor: [17, 17] });
      leaflet.marker(coordinate(stop)!, { icon, title: stop.name, alt: stop.name, keyboard: true, zIndexOffset: selected === key ? 1000 : 0 })
        .on("click", () => {
          route.selectStop(key);
          if (expanded) setExpanded(false);
          window.setTimeout(() => document.getElementById(route.stopId(key))?.scrollIntoView({ behavior: "smooth", block: "center" }), expanded ? 80 : 0);
        }).addTo(routeLayer);
    });
    const nextFit = JSON.stringify([group, positions]);
    if (positions.length && fitSignature.current !== nextFit) {
      instance.fitBounds(leaflet.latLngBounds(positions), { paddingTopLeft: [34, 55], paddingBottomRight: [40, 35], maxZoom: 15, animate: false });
      fitSignature.current = nextFit;
    }
    // Rebuild only for completed primitive changes, not each new streamed object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaflet, stopSignature, pathSignature, group, selected, version, expanded, streetRoute, routeKind]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => map.current?.invalidateSize({ animate: false }));
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
    <div ref={container} className={`tv-map-wrap${expanded ? " is-expanded" : ""}`} role={expanded ? "dialog" : "region"} aria-modal={expanded || undefined} aria-label="Sightseeing route map" data-route-kind={routeKind} tabIndex={expanded ? -1 : undefined}>
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
          if (leaflet && fitPoints.current.length) map.current?.fitBounds(leaflet.latLngBounds(fitPoints.current), { paddingTopLeft: [34, 55], paddingBottomRight: [40, 35], maxZoom: 15, animate: true });
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
