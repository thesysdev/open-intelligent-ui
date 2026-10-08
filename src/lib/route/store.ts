"use client";

import { createContext, createElement, useContext, useId, useState, useSyncExternalStore, type ReactNode } from "react";

export type StopData = {
  id?: string;
  name?: string;
  wikiTitle?: string;
  lat?: number;
  lng?: number;
  time?: string;
  story?: string;
  beforeYouGo?: string;
  category?: string;
  photos?: string[];
  imageUrl?: string;
  imageFocalX?: number;
  emoji?: string;
  description?: string;
  link?: string;
};

export const getStopKey = (stop: StopData) => stop.id || stop.name || "";

/** Each response owns its edits; shared photo caching below remains read-only. */
export function createRouteStore(namespace: string) {
  const removed = new Set<string>();
  let added: StopData[] = [];
  const listeners = new Set<() => void>();
  let version = 0;
  let selected: string | null = null;
  const bump = () => { version++; listeners.forEach((listener) => listener()); };
  return {
    namespace,
    mapId: `${namespace}-map`,
    stopId: (key: string) => `${namespace}-stop-${encodeURIComponent(key)}`,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => version,
    getServerSnapshot: () => 0,
    getSelected: () => selected,
    selectStop(key: string | null) { selected = key; bump(); },
    toggleStop(key: string) {
      if (!key) return;
      if (removed.has(key)) removed.delete(key);
      else removed.add(key);
      bump();
    },
    addStop(stop: StopData) {
      const key = getStopKey(stop);
      if (!key || added.some((candidate) => getStopKey(candidate) === key)) return;
      added = [...added, { ...stop }];
      removed.delete(key);
      bump();
    },
    isRemoved: (key: string) => removed.has(key),
    isAdded: (key: string) => added.some((stop) => getStopKey(stop) === key),
    getAdded: (): readonly StopData[] => added,
  };
}

type RouteStore = ReturnType<typeof createRouteStore>;
const RouteStoreContext = createContext<RouteStore | null>(null);

export function RouteStoreProvider({ children }: { children: ReactNode }) {
  const id = useId();
  const [store] = useState(() => createRouteStore(`route-${id}`));
  return createElement(RouteStoreContext.Provider, { value: store }, children);
}

export function useRouteStore() {
  const context = useContext(RouteStoreContext);
  const id = useId();
  // Standalone route components also stay isolated when no response provider exists.
  const [local] = useState(() => createRouteStore(`route-${id}`));
  const store = context ?? local;
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return store;
}

export type WikiInfo = { lat?: number; lng?: number; photos: string[] };
type WikiSummary = { thumbnail?: { source?: string }; coordinates?: { lat?: number; lon?: number } };
type WikiMedia = { items?: { type?: string; srcset?: { src: string }[] }[] };
const wikiCache = new Map<string, Promise<WikiInfo>>();

export function fetchWiki(title: string): Promise<WikiInfo> {
  if (!wikiCache.has(title)) {
    const t = encodeURIComponent(title.replace(/ /g, "_"));
    // A missing article is a real answer; any other failure is retried next time.
    const get = (url: string) => fetch(url).then((r) => {
      if (r.status === 404) return {};
      if (!r.ok) throw new Error(`Wikipedia ${r.status}`);
      return r.json();
    });
    const p = Promise.all([
      get(`https://en.wikipedia.org/api/rest_v1/page/summary/${t}`),
      get(`https://en.wikipedia.org/api/rest_v1/page/media-list/${t}`),
    ])
      .then(([s, m]: [WikiSummary, WikiMedia]) => {
        const photos: string[] = [];
        const key = (u: string) => decodeURIComponent(u.split("?")[0].split("/").slice(-1)[0]).replace(/^\d+px-/, "");
        if (s?.thumbnail?.source) photos.push(s.thumbnail.source);
        for (const it of m?.items ?? []) {
          if (it.type !== "image" || !it.srcset?.length) continue;
          const src: string = it.srcset[0].src;
          if (/\.svg|icon|logo|map|flag|seal/i.test(src)) continue;
          const url = src.startsWith("//") ? `https:${src}` : src;
          if (!photos.some((p) => key(p) === key(url))) photos.push(url);
          if (photos.length >= 3) break;
        }
        return { lat: s?.coordinates?.lat, lng: s?.coordinates?.lon, photos };
      })
      .catch(() => {
        wikiCache.delete(title);
        return { photos: [] };
      });
    wikiCache.set(title, p);
  }
  return wikiCache.get(title)!;
}
