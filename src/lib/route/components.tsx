"use client";

import { defineComponent } from "@openuidev/react-lang";
import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { z } from "zod/v4";
import {
  fetchWiki,
  getStopKey,
  useRouteStore,
  type StopData,
  type WikiInfo,
} from "./store";

const RouteStopSchema = z.object({
  name: z.string().min(1).max(160),
  wikiTitle: z.string().max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  time: z.string().max(120),
  story: z.string().max(1200),
  beforeYouGo: z.string().max(600),
  category: z.string().max(60).optional(),
  id: z.string().max(120).optional(),
});

function useWiki(title?: string) {
  const [result, setResult] = useState<{ title: string; info: WikiInfo } | null>(null);
  useEffect(() => {
    if (!title) return;
    let live = true;
    fetchWiki(title).then((info) => live && setResult({ title, info }));
    return () => {
      live = false;
    };
  }, [title]);
  return result && result.title === title ? result.info : null;
}

const toStops = (items: unknown[] | undefined): StopData[] =>
  (items ?? []).map((s) => s && typeof s === "object" && "props" in s ? s.props as StopData : {});

function withAdded(stops: StopData[], added: readonly StopData[]) {
  const keys = new Set(stops.map(getStopKey));
  return [...stops, ...added.filter((stop) => !keys.has(getStopKey(stop)))];
}

function Photos({ title, count = 3 }: { title?: string; count?: number }) {
  const wiki = useWiki(title);
  const photos = wiki?.photos.slice(0, count) ?? [];
  if ((!title || wiki) && !photos.length) return (
    <div className="rt-photos rt-photo-empty" aria-label={`No photograph available for ${title || "this stop"}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
      <span>Explore this stop on the map</span>
    </div>
  );
  return (
    <div className="rt-photos" style={{ gridTemplateColumns: `repeat(${photos.length || count},1fr)` }} aria-busy={!wiki}>
      {Array.from({ length: photos.length || count }, (_, i) =>
        photos[i] ? <img key={i} src={photos[i]} alt={`${title ?? "Destination"}, photo ${i + 1}`} loading="lazy" /> : <div key={i} className="rt-photo-skel" aria-hidden="true" />,
      )}
    </div>
  );
}

function StopCard({ stop, index, isNew }: { stop: StopData; index: number; isNew?: boolean }) {
  const route = useRouteStore();
  const key = getStopKey(stop);
  const off = !!key && route.isRemoved(key);
  return (
    <div id={key ? route.stopId(key) : undefined} className={`rt-card ${off ? "rt-removed" : ""} ${isNew ? "rt-card-new" : ""}`}>
      <Photos title={stop.wikiTitle} />
      <div className="rt-title">
        <span className="rt-num" aria-label={`Stop ${index + 1}`}>{index + 1}</span>
        {stop.name}
        {isNew && <span className="rt-badge">Added</span>}
      </div>
      {stop.time && <div className="rt-time"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 5.5V10l-2.5 2" /></svg>{stop.time}</div>}
      {stop.story && (
        <>
          <div className="rt-h">The story</div>
          <p>{stop.story}</p>
        </>
      )}
      {stop.beforeYouGo && (
        <>
          <div className="rt-h">Before you go</div>
          <p>{stop.beforeYouGo}</p>
        </>
      )}
      {stop.name && (
        <button className="rt-btn" type="button" aria-pressed={!off} aria-label={`${off ? "Add" : "Remove"} ${stop.name} ${off ? "to" : "from"} my route`} onClick={() => route.toggleStop(key)}>
          {off ? "Add back to my itinerary" : "Remove from my itinerary"}
        </button>
      )}
    </div>
  );
}

export const RouteStop = defineComponent({
  name: "RouteStop",
  props: RouteStopSchema,
  description:
    "One stop on a route. wikiTitle is the exact English Wikipedia article title (used to load real photos). lat/lng are decimal coordinates. time e.g. '9:00 · 1 hr'. story: 1-2 sentences of history. beforeYouGo: one practical tip. Optional category groups the map, e.g. 'Landmarks', 'Museums' or 'Neighborhoods'. Optional id distinguishes repeated visits or stops with identical names in a route.",
  component: ({ props }) => <StopCard stop={props} index={0} />,
});

function MapView({ base }: { base: StopData[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [group, setGroup] = useState("all");
  const route = useRouteStore();
  const version = route.getSnapshot();
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});
  const stops = withAdded(base, route.getAdded());
  const baseCount = base.length;
  const categories = [...new Set(stops.map((stop) => stop.category).filter((category): category is string => !!category))];

  useEffect(() => {
    let live = true;
    import("leaflet").then((m) => { if (live) setL(m.default ?? m); });
    return () => { live = false; };
  }, []);

  const titles = stops.map((s) => s.wikiTitle ?? "").join("|");
  const stopSignature = JSON.stringify(stops.map((stop) => [getStopKey(stop), stop.name, stop.lat, stop.lng, stop.category]));
  useEffect(() => {
    let live = true;
    stops.forEach((s) => {
      if (!s.wikiTitle || !s.name) return;
      fetchWiki(s.wikiTitle).then((w) => {
        if (live && w.lat != null && w.lng != null) setCoords((c) => ({ ...c, [getStopKey(s)]: [w.lat!, w.lng!] }));
      });
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titles]);

  useEffect(() => {
    if (!L || !el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([20, 0], 2);
    map.current.attributionControl.setPrefix(false);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri",
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, [L]);

  useEffect(() => {
    if (!L || !map.current || !layer.current) return;
    const routeLayer = layer.current;
    routeLayer.clearLayers();
    const pts: [number, number][] = [];
    stops.forEach((s, i) => {
      if (!s.name) return;
      const key = getStopKey(s);
      const p: [number, number] | null = s.lat != null && s.lng != null ? [s.lat, s.lng] : coords[key] ?? null;
      if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 90 || Math.abs(p[1]) > 180) return;
      const off = route.isRemoved(key);
      const fresh = i >= baseCount;
      if (group === "active" && off) return;
      if (group === "removed" && !off) return;
      if (group.startsWith("category:") && s.category !== group.slice(9)) return;
      if (!off) pts.push(p);
      const markerContent = document.createElement("div");
      const pin = document.createElement("div");
      pin.className = `rt-pin ${off ? "rt-pin-off" : ""} ${fresh ? "rt-pin-new" : ""}`;
      pin.textContent = String(i + 1);
      markerContent.append(pin);
      if (fresh) {
        const label = document.createElement("div");
        label.className = "rt-pin-label";
        label.textContent = s.name;
        markerContent.append(label);
      }
      const icon = L.divIcon({
        className: "",
        html: markerContent,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker(p, { icon, zIndexOffset: fresh ? 1000 : 0, title: `${i + 1}. ${s.name}`, alt: s.name })
        .on("click", () => document.getElementById(route.stopId(key))?.scrollIntoView({ behavior: "smooth", block: "center" }))
        .addTo(routeLayer);
    });
    if (pts.length > 1) L.polyline(pts, { color: "#0d0d0d", weight: 2.5, dashArray: "5 7", opacity: 0.65 }).addTo(routeLayer);
    if (pts.length) map.current.fitBounds(L.latLngBounds(pts).pad(0.2), { animate: true, maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, titles, stopSignature, coords, version, group]);

  useEffect(() => {
    const timeout = setTimeout(() => map.current?.invalidateSize(), 220);
    return () => clearTimeout(timeout);
  }, [expanded]);

  const active = stops.filter((s) => s.name && !route.isRemoved(getStopKey(s))).length;
  return (
    <div id={route.mapId} className="rt-map-wrap" style={{ height: expanded ? 480 : 300 }}>
      <div ref={el} className="rt-map" aria-label="Interactive route map. Select a numbered stop to view its details." />
      <label className="rt-chip rt-group-filter">
        <select aria-label="Filter map groups" value={group} onChange={(event) => setGroup(event.target.value)}>
          <option value="all">All groups</option>
          {categories.map((category) => <option key={category} value={`category:${category}`}>{category}</option>)}
          <option value="active">My itinerary ({active})</option>
          <option value="removed">Removed stops ({stops.length - active})</option>
        </select>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </label>
      <button className="rt-chip rt-expand" type="button" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Collapse" : "Expand"}
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3h5v5M17 3l-6 6M8 17H3v-5M3 17l6-6" /></svg>
      </button>
    </div>
  );
}

export const RouteMap = defineComponent({
  name: "RouteMap",
  props: z.object({ stops: z.array(RouteStop.ref).max(50) }),
  description:
    "Interactive map that plots RouteStop items in visiting order with a walking path. Always reuse the SAME RouteStop references in RouteStops below it.",
  component: ({ props }) => <MapView base={toStops(props.stops)} />,
});

function StopList({ base }: { base: StopData[] }) {
  const route = useRouteStore();
  const stops = withAdded(base, route.getAdded());
  return (
    <div className="rt-list">
      {stops.map((s, i) => (
        <StopCard key={getStopKey(s) || i} stop={s} index={i} isNew={i >= base.length} />
      ))}
    </div>
  );
}

export const RouteStops = defineComponent({
  name: "RouteStops",
  props: z.object({ stops: z.array(RouteStop.ref).max(50) }),
  description: "Photo cards for each RouteStop (real photos, story, tips, remove-from-route toggle).",
  component: ({ props }) => <StopList base={toStops(props.stops)} />,
});

function SuggestionCard({ stop }: { stop: StopData }) {
  const route = useRouteStore();
  const done = !!stop.name && route.isAdded(getStopKey(stop));
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (scrollTimer.current) clearTimeout(scrollTimer.current); }, []);
  return (
    <div className="rt-sugg">
      <Photos title={stop.wikiTitle} count={1} />
      <div className="rt-sugg-name">{stop.name}</div>
      {stop.time && <div className="rt-sugg-time">{stop.time}</div>}
      <button
        type="button"
        className={`rt-btn rt-add ${done ? "rt-added" : ""}`}
        disabled={done || !stop.name}
        onClick={(e) => {
          const btn = e.currentTarget;
          const before = btn.getBoundingClientRect().top;
          let sc: HTMLElement | null = btn.parentElement;
          while (sc && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
          route.addStop(stop);
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const delta = btn.getBoundingClientRect().top - before;
              if (delta) (sc ?? document.scrollingElement)?.scrollBy({ top: delta, behavior: "instant" as ScrollBehavior });
            }),
          );
          if (scrollTimer.current) clearTimeout(scrollTimer.current);
          scrollTimer.current = setTimeout(() => document.getElementById(route.mapId)?.scrollIntoView({ behavior: "smooth", block: "center" }), 1300);
        }}
      >
        {done ? "✓ Added to route" : "+ Add to my route"}
      </button>
    </div>
  );
}

export const RouteSuggestions = defineComponent({
  name: "RouteSuggestions",
  props: z.object({ title: z.string().max(160), stops: z.array(RouteStop.ref).max(12) }),
  description:
    "Optional extra stops the user can add to the route with one tap (adds a pin to RouteMap and a card to RouteStops). Use 2 stops that are NOT already in the route.",
  component: ({ props }) => (
    <div className="rt-sugg-wrap">
      <div className="rt-h rt-sugg-title">{props.title}</div>
      <div className="rt-sugg-row">
        {toStops(props.stops).map((s, i) => (
          <SuggestionCard key={getStopKey(s) || i} stop={s} />
        ))}
      </div>
    </div>
  ),
});
