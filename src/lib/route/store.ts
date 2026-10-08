import { useSyncExternalStore } from "react";

export type StopData = {
  name?: string;
  wikiTitle?: string;
  lat?: number;
  lng?: number;
  time?: string;
  story?: string;
  beforeYouGo?: string;
};

const removed = new Set<string>();
const added: StopData[] = [];
const listeners = new Set<() => void>();
let version = 0;
const bump = () => {
  version++;
  listeners.forEach((l) => l());
};

export function toggleStop(name: string) {
  if (removed.has(name)) removed.delete(name);
  else removed.add(name);
  bump();
}

export function addStop(stop: StopData) {
  if (!stop.name || added.some((a) => a.name === stop.name)) return;
  added.push(stop);
  bump();
}

export const isRemoved = (name: string) => removed.has(name);
export const isAdded = (name: string) => added.some((a) => a.name === name);
export const getAdded = () => added;

export function useRouteVersion() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
    () => version,
  );
}

export type WikiInfo = { lat?: number; lng?: number; photos: string[] };
const wikiCache = new Map<string, Promise<WikiInfo>>();

export function fetchWiki(title: string): Promise<WikiInfo> {
  if (!wikiCache.has(title)) {
    const t = encodeURIComponent(title.replace(/ /g, "_"));
    const p = Promise.all([
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${t}`).then((r) => (r.ok ? r.json() : {})),
      fetch(`https://en.wikipedia.org/api/rest_v1/page/media-list/${t}`).then((r) => (r.ok ? r.json() : {})),
    ])
      .then(([s, m]: any[]) => {
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
      .catch(() => ({ photos: [] }));
    wikiCache.set(title, p);
  }
  return wikiCache.get(title)!;
}
