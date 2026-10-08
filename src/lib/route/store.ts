"use client";

import { useStateField } from "@openuidev/react-lang";
import { createContext, createElement, useContext, useId, type ReactNode } from "react";

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

// The Card root gives every component in one response the same id prefix.
const RouteNamespace = createContext<string | null>(null);

export function RouteStoreProvider({ children }: { children: ReactNode }) {
  const id = useId();
  return createElement(RouteNamespace.Provider, { value: `route-${id}` }, children);
}

/**
 * Per-response route edits (removed stops, added suggestions, selected stop),
 * kept in OpenUI's own response state via useStateField. AgentInterface saves
 * that state with the message, so edits stay with the thread and reach the
 * model as context on the next turn.
 */
export function useRouteStore() {
  const context = useContext(RouteNamespace);
  const id = useId();
  const namespace = context ?? `route-${id}`;
  const removed = useStateField<string[]>("routeRemoved", []);
  const added = useStateField<StopData[]>("routeAdded", []);
  const selected = useStateField<string | null>("routeSelected", null);
  const removedKeys = (removed.value as string[] | undefined) ?? [];
  const addedStops = (added.value as StopData[] | undefined) ?? [];
  return {
    mapId: `${namespace}-map`,
    stopId: (key: string) => `${namespace}-stop-${encodeURIComponent(key)}`,
    /** Changes whenever stops are removed or added. */
    version: JSON.stringify([removedKeys, addedStops.map(getStopKey)]),
    getSelected: () => (selected.value as string | null | undefined) ?? null,
    selectStop: (key: string | null) => selected.setValue(key),
    toggleStop(key: string) {
      if (!key) return;
      removed.setValue(removedKeys.includes(key) ? removedKeys.filter((k) => k !== key) : [...removedKeys, key]);
    },
    addStop(stop: StopData) {
      const key = getStopKey(stop);
      if (!key || addedStops.some((candidate) => getStopKey(candidate) === key)) return;
      // Only plain stop fields: this is saved with the message.
      const { id: stopId, name, wikiTitle, lat, lng, time, story, beforeYouGo, category, photos, imageUrl, imageFocalX, emoji, description, link } = stop;
      added.setValue([...addedStops, { id: stopId, name, wikiTitle, lat, lng, time, story, beforeYouGo, category, photos, imageUrl, imageFocalX, emoji, description, link }]);
      if (removedKeys.includes(key)) removed.setValue(removedKeys.filter((k) => k !== key));
    },
    isRemoved: (key: string) => removedKeys.includes(key),
    isAdded: (key: string) => addedStops.some((stop) => getStopKey(stop) === key),
    getAdded: (): readonly StopData[] => addedStops,
  };
}

export type WikiInfo = { lat?: number; lng?: number; photos: string[] };
const wikiCache = new Map<string, Promise<WikiInfo>>();

/** Photos and coordinates for a Wikipedia title, via /api/wiki. Failures are retried next time. */
export function fetchWiki(title: string): Promise<WikiInfo> {
  if (!wikiCache.has(title)) {
    const request = fetch(`/api/wiki?title=${encodeURIComponent(title)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`wiki ${response.status}`);
        return response.json() as Promise<WikiInfo>;
      })
      .catch(() => {
        wikiCache.delete(title);
        return { photos: [] };
      });
    wikiCache.set(title, request);
  }
  return wikiCache.get(title)!;
}
