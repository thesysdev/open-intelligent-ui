"use client";

import { defineComponent } from "@openuidev/react-lang";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { z } from "zod/v4";
import { addPin, addRouteLayer, fitPoints, loadMapLibre, MAP_STYLE, setRoute, type MapLibre } from "./map";
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
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const fitted = useRef(false);
  const [lib, setLib] = useState<MapLibre | null>(null);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const version = useRouteVersion();
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});
  const stops = withAdded(base);
  const baseCount = base.length;

  useEffect(() => {
    let live = true;
    loadMapLibre().then((m) => { if (live) setLib(m); });
    return () => { live = false; };
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
    if (!lib || !el.current || map.current) return;
    const instance = new lib.Map({
      container: el.current,
      style: MAP_STYLE,
      center: [-122.43, 37.79],
      zoom: 11,
      attributionControl: { compact: true },
    });
    map.current = instance;
    instance.on("load", () => {
      addRouteLayer(instance, "#111", 0.8);
      setReady(true);
    });
    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      instance.remove();
      map.current = null;
      fitted.current = false;
      setReady(false);
    };
  }, [lib]);

  useEffect(() => {
    if (!lib || !ready || !map.current) return;
    const instance = map.current;
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    const pts: [number, number][] = [];
    stops.forEach((s, i) => {
      if (!s.name) return;
      const p = coords[s.name] ?? (s.lat != null && s.lng != null ? [s.lat, s.lng] : null);
      if (!p || Number.isNaN(p[0]) || Number.isNaN(p[1])) return;
      const point: [number, number] = [p[1], p[0]];
      const off = isRemoved(s.name);
      const fresh = i >= baseCount;
      if (!off) pts.push(point);
      const marker = document.createElement("div");
      marker.className = "rt-marker";
      if (fresh) marker.style.zIndex = "1";
      const pin = document.createElement("div");
      pin.className = `rt-pin ${off ? "rt-pin-off" : ""} ${fresh ? "rt-pin-new" : ""}`;
      pin.textContent = String(i + 1);
      marker.append(pin);
      if (fresh) {
        const label = document.createElement("div");
        label.className = "rt-pin-label";
        label.textContent = s.name;
        marker.append(label);
      }
      markers.current.push(addPin(lib, instance, marker, point, `${i + 1}. ${s.name}`, () =>
        document.getElementById(slug(s.name!))?.scrollIntoView({ behavior: "smooth", block: "center" })));
    });
    setRoute(instance, pts);
    // Jump into place the first time; animate later changes such as an added stop.
    fitPoints(lib, instance, pts, 14, fitted.current);
    if (pts.length) fitted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib, ready, titles, coords, version]);

  useEffect(() => {
    const timeout = setTimeout(() => map.current?.resize(), 220);
    return () => clearTimeout(timeout);
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
