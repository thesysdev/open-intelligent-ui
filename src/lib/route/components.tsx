"use client";

import { defineComponent } from "@openuidev/react-lang";
import { useEffect, useRef, useState } from "react";
import { z } from "zod/v4";
import {
  addStop,
  fetchWiki,
  getAdded,
  isAdded,
  isRemoved,
  toggleStop,
  useRouteVersion,
  type StopData,
  type WikiInfo,
} from "./store";

const RouteStopSchema = z.object({
  name: z.string(),
  wikiTitle: z.string(),
  lat: z.number(),
  lng: z.number(),
  time: z.string(),
  story: z.string(),
  beforeYouGo: z.string(),
});

function useWiki(title?: string) {
  const [info, setInfo] = useState<WikiInfo | null>(null);
  useEffect(() => {
    if (!title) return;
    let live = true;
    fetchWiki(title).then((i) => live && setInfo(i));
    return () => {
      live = false;
    };
  }, [title]);
  return info;
}

const slug = (s: string) => `stop-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
const toStops = (items: any[] | undefined): StopData[] => (items ?? []).map((s) => s?.props ?? {});

function withAdded(stops: StopData[]) {
  const names = new Set(stops.map((s) => s.name));
  return [...stops, ...getAdded().filter((a) => !names.has(a.name))];
}

function Photos({ title, count = 3 }: { title?: string; count?: number }) {
  const wiki = useWiki(title);
  return (
    <div className="rt-photos" style={{ gridTemplateColumns: `repeat(${count},1fr)` }}>
      {Array.from({ length: count }, (_, i) =>
        wiki?.photos[i] ? <img key={i} src={wiki.photos[i]} alt={title ?? ""} /> : <div key={i} className="rt-photo-skel" />,
      )}
    </div>
  );
}

function StopCard({ stop, index, isNew }: { stop: StopData; index: number; isNew?: boolean }) {
  useRouteVersion();
  const off = !!stop.name && isRemoved(stop.name);
  return (
    <div id={stop.name ? slug(stop.name) : undefined} className={`rt-card ${off ? "rt-removed" : ""} ${isNew ? "rt-card-new" : ""}`}>
      <Photos title={stop.wikiTitle} />
      <div className="rt-title">
        <span className="rt-num">{index + 1}</span>
        {stop.name}
        {isNew && <span className="rt-badge">Added</span>}
      </div>
      {stop.time && <div className="rt-time">{stop.time}</div>}
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
        <button className="rt-btn" onClick={() => toggleStop(stop.name!)}>
          {off ? "Add back to my route" : "Remove from my route"}
        </button>
      )}
    </div>
  );
}

export const RouteStop = defineComponent({
  name: "RouteStop",
  props: RouteStopSchema,
  description:
    "One stop on a route. wikiTitle is the exact English Wikipedia article title (used to load real photos). lat/lng are decimal coordinates. time e.g. '9:00 · 1 hr'. story: 1-2 sentences of history. beforeYouGo: one practical tip.",
  component: ({ props }) => <StopCard stop={props} index={0} />,
});

function MapView({ base }: { base: StopData[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const layer = useRef<any>(null);
  const [L, setL] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  const version = useRouteVersion();
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});
  const stops = withAdded(base);
  const baseCount = base.length;

  useEffect(() => {
    import("leaflet").then((m) => setL(m.default ?? m));
  }, []);

  const titles = stops.map((s) => s.wikiTitle ?? "").join("|");
  useEffect(() => {
    stops.forEach((s) => {
      if (!s.wikiTitle || !s.name) return;
      fetchWiki(s.wikiTitle).then((w) => {
        if (w.lat != null && w.lng != null) setCoords((c) => ({ ...c, [s.name!]: [w.lat!, w.lng!] }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titles]);

  useEffect(() => {
    if (!L || !el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: false, attributionControl: false }).setView([37.79, -122.43], 12);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
  }, [L]);

  useEffect(() => {
    if (!L || !map.current) return;
    layer.current.clearLayers();
    const pts: [number, number][] = [];
    stops.forEach((s, i) => {
      if (!s.name) return;
      const p = coords[s.name] ?? (s.lat != null && s.lng != null ? [s.lat, s.lng] : null);
      if (!p || Number.isNaN(p[0]) || Number.isNaN(p[1])) return;
      const off = isRemoved(s.name);
      const fresh = i >= baseCount;
      if (!off) pts.push(p as [number, number]);
      const icon = L.divIcon({
        className: "",
        html: `<div class="rt-pin ${off ? "rt-pin-off" : ""} ${fresh ? "rt-pin-new" : ""}">${i + 1}</div>${
          fresh ? `<div class="rt-pin-label">${s.name}</div>` : ""
        }`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(p, { icon, zIndexOffset: fresh ? 1000 : 0 })
        .on("click", () => document.getElementById(slug(s.name!))?.scrollIntoView({ behavior: "smooth", block: "center" }))
        .addTo(layer.current);
    });
    if (pts.length > 1) L.polyline(pts, { color: "#111", weight: 3, dashArray: "6 6", opacity: 0.8 }).addTo(layer.current);
    if (pts.length) map.current.fitBounds(L.latLngBounds(pts).pad(0.2), { animate: true, maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, titles, coords, version]);

  useEffect(() => {
    setTimeout(() => map.current?.invalidateSize(), 220);
  }, [expanded]);

  const active = stops.filter((s) => s.name && !isRemoved(s.name)).length;
  return (
    <div className="rt-map-wrap" style={{ height: expanded ? 420 : 240 }}>
      <div ref={el} className="rt-map" />
      <div key={active} className="rt-chip rt-chip-count">
        {active} stops
      </div>
      <button className="rt-chip rt-expand" onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Collapse" : "Expand"} ⤢
      </button>
    </div>
  );
}

export const RouteMap = defineComponent({
  name: "RouteMap",
  props: z.object({ stops: z.array(RouteStop.ref) }),
  description:
    "Interactive map that plots RouteStop items in visiting order with a walking path. Always reuse the SAME RouteStop references in RouteStops below it.",
  component: ({ props }) => <MapView base={toStops(props.stops)} />,
});

function StopList({ base }: { base: StopData[] }) {
  useRouteVersion();
  const stops = withAdded(base);
  return (
    <div className="rt-list">
      {stops.map((s, i) => (
        <StopCard key={s.name ?? i} stop={s} index={i} isNew={i >= base.length} />
      ))}
    </div>
  );
}

export const RouteStops = defineComponent({
  name: "RouteStops",
  props: z.object({ stops: z.array(RouteStop.ref) }),
  description: "Photo cards for each RouteStop (real photos, story, tips, remove-from-route toggle).",
  component: ({ props }) => <StopList base={toStops(props.stops)} />,
});

function SuggestionCard({ stop }: { stop: StopData }) {
  useRouteVersion();
  const done = !!stop.name && isAdded(stop.name);
  return (
    <div className="rt-sugg">
      <Photos title={stop.wikiTitle} count={1} />
      <div className="rt-sugg-name">{stop.name}</div>
      {stop.time && <div className="rt-sugg-time">{stop.time}</div>}
      <button
        className={`rt-btn rt-add ${done ? "rt-added" : ""}`}
        disabled={done || !stop.name}
        onClick={(e) => {
          const btn = e.currentTarget;
          const before = btn.getBoundingClientRect().top;
          let sc: HTMLElement | null = btn.parentElement;
          while (sc && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
          addStop(stop);
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const delta = btn.getBoundingClientRect().top - before;
              if (delta) (sc ?? document.scrollingElement)?.scrollBy({ top: delta, behavior: "instant" as ScrollBehavior });
            }),
          );
          setTimeout(() => document.querySelector(".rt-map-wrap")?.scrollIntoView({ behavior: "smooth", block: "center" }), 1300);
        }}
      >
        {done ? "✓ Added to route" : "+ Add to my route"}
      </button>
    </div>
  );
}

export const RouteSuggestions = defineComponent({
  name: "RouteSuggestions",
  props: z.object({ title: z.string(), stops: z.array(RouteStop.ref) }),
  description:
    "Optional extra stops the user can add to the route with one tap (adds a pin to RouteMap and a card to RouteStops). Use 2 stops that are NOT already in the route.",
  component: ({ props }) => (
    <div className="rt-sugg-wrap">
      <div className="rt-h rt-sugg-title">{props.title}</div>
      <div className="rt-sugg-row">
        {toStops(props.stops).map((s, i) => (
          <SuggestionCard key={s.name ?? i} stop={s} />
        ))}
      </div>
    </div>
  ),
});
