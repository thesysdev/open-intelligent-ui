"use client";

import { defineComponent, useIsStreaming } from "@openuidev/react-lang";
import { useEffect, useRef, useState } from "react";
import { TravelMapView } from "../travel/map";
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
  photos: z.array(z.string()).max(3).optional(),
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

const isImageUrl = (url: unknown): url is string => typeof url === "string" && /^https:\/\//.test(url);

// Prefers the image-search URLs the model put on the stop, then Wikipedia
// photos for any slot that is empty or whose image fails to load.
function Photos({ title, photos, count = 3 }: { title?: string; photos?: string[]; count?: number }) {
  const wiki = useWiki(title);
  const [failed, setFailed] = useState<string[]>([]);
  const found = (photos ?? []).filter(isImageUrl);
  const urls = [...new Set([...found, ...(wiki?.photos ?? [])])].filter((url) => !failed.includes(url)).slice(0, count);
  return (
    <div className="rt-photos" style={{ gridTemplateColumns: `repeat(${count},1fr)` }}>
      {Array.from({ length: count }, (_, i) =>
        urls[i] ? (
          <img
            key={urls[i]}
            src={urls[i]}
            alt={title ?? ""}
            referrerPolicy="no-referrer"
            onError={() => setFailed((f) => [...f, urls[i]])}
          />
        ) : (
          <div key={i} className="rt-photo-skel" />
        ),
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
      <Photos photos={stop.photos} title={stop.wikiTitle} />
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
  const route = useRouteStore();
  const streaming = useIsStreaming();
  const stops = withAdded(base, route.getAdded()).map((stop) => ({
    ...stop, id: getStopKey(stop), emoji: stop.emoji || "📍", category: stop.category || "Stops",
  }));
  return <TravelMapView stops={stops} streaming={streaming} />;
}

export const RouteMap = defineComponent({
  name: "RouteMap",
  props: z.object({ stops: z.array(RouteStop.ref).max(50) }),
  description:
    "Interactive map that plots RouteStop items in visiting order with a street-route overview. Always reuse the SAME RouteStop references in RouteStops below it.",
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
      <Photos photos={stop.photos} title={stop.wikiTitle} count={1} />
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
          scrollTimer.current = setTimeout(() => document.getElementById(`${route.mapId}-travel`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 1300);
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
