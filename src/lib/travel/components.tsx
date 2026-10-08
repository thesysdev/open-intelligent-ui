"use client";

import { defineComponent, useIsStreaming } from "@openuidev/react-lang";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { z } from "zod/v4";
import { fetchWiki, getStopKey, useRouteStore, type StopData } from "../route/store";
import { TravelMapView } from "./map";
import { coordinate } from "./map-utils";
import "./travel.css";

export function safeUrl(value: unknown, local = false): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (local && value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch { return undefined; }
}

export function nodeProps<T extends object>(items: unknown): Partial<T>[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const props = "props" in item ? item.props : item;
    return props && typeof props === "object" ? [props as Partial<T>] : [];
  });
}

/** A small, safe inline grammar. Partial model tokens remain readable as text. */
export function InlineText({ text, animate = false }: { text?: string; animate?: boolean }) {
  if (typeof text !== "string") return null;
  const pattern = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  const words = (value: string, offset: number) => animate ? value.split(/(\s+)/).map((word, i) => /\S/.test(word)
    ? <span className="tv-stream-word" key={`${offset}-${i}`} style={{ "--word-delay": `${(i % 12) * 12}ms` } as CSSProperties}>{word}</span> : word) : value;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(animate ? <span key={`plain-${cursor}`}>{words(text.slice(cursor, index), cursor)}</span> : text.slice(cursor, index));
    if (match[2]) nodes.push(<strong key={index}>{words(match[2], index)}</strong>);
    else nodes.push(<a key={index} href={safeUrl(match[4])} target="_blank" rel="noreferrer">{words(match[3], index)}</a>);
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(animate ? <span key={`plain-${cursor}`}>{words(text.slice(cursor), cursor)}</span> : text.slice(cursor));
  return <>{nodes}</>;
}

function StreamingText({ text }: { text?: string }) {
  // Keep token wrappers stable after completion so existing words never flash again.
  const streaming = useIsStreaming();
  const [enteredWhileStreaming] = useState(streaming);
  return <InlineText text={text} animate={enteredWhileStreaming} />;
}

export type CitationData = { label: string; url: string; icon?: string };

function Citation({ citation }: { citation: Partial<CitationData> }) {
  const href = safeUrl(citation.url);
  const iconUrl = safeUrl(citation.icon, true);
  if (!citation.label || !href) return null;
  return <a className="tv-citation" href={href} target="_blank" rel="noreferrer" title={citation.label}>
    {citation.icon && (iconUrl ? <img src={iconUrl} alt="" aria-hidden="true" /> : <span aria-hidden="true">{citation.icon}</span>)}
    <span>{citation.label}</span>
  </a>;
}

export const TravelCitation = defineComponent({
  name: "TravelCitation",
  props: z.object({ label: z.string(), url: z.string(), icon: z.string().optional() }),
  description: "A compact inline source link. Use an actual supporting source URL; icon is an optional emoji or safe source favicon URL.",
  component: ({ props }) => <Citation citation={props} />,
});

export const TravelHeading = defineComponent({
  name: "TravelHeading",
  props: z.object({ text: z.string(), level: z.enum(["title", "section"]) }),
  description: "A restrained response heading. Use title once, then section for smaller section headings.",
  component: ({ props }) => props.level === "section"
    ? <h2 className="tv-heading tv-section-heading"><StreamingText text={props.text} /></h2>
    : <h1 className="tv-heading tv-title"><StreamingText text={props.text} /></h1>,
});

export const TravelProse = defineComponent({
  name: "TravelProse",
  props: z.object({ text: z.string(), citations: z.array(TravelCitation.ref).optional() }),
  description: "An ordinary response paragraph. Supports **bold** and [label](https://url) inline. Optional citations appear as small inline source pills.",
  component: ({ props }) => <p className="tv-prose"><StreamingText text={props.text} />{nodeProps<CitationData>(props.citations).map((citation, i) => <Citation key={`${citation.url}-${i}`} citation={citation} />)}</p>,
});

export type ImageData = { src: string; alt: string; link?: string; wikiTitle?: string; focalX?: number };

function Photo({ photo, bookmark = false, hideIfMissing = false }: { photo: Partial<ImageData>; bookmark?: boolean; hideIfMissing?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [wikiImages, setWikiImages] = useState<{ title: string; urls: string[] } | null>(null);
  // Compare normalized URLs: failedUrls holds what the <img> actually loaded,
  // which differs from the raw string when it has spaces or accented letters.
  const primary = safeUrl(photo.src, true);
  const primaryOk = !!primary && !failedUrls.includes(primary);
  useEffect(() => {
    if (primaryOk || !photo.wikiTitle) return;
    let active = true;
    const title = photo.wikiTitle;
    fetchWiki(title).then((info) => { if (active) setWikiImages({ title, urls: info.photos }); });
    return () => { active = false; };
  }, [primaryOk, photo.wikiTitle]);
  // Try the supplied image, then each Wikipedia photo in turn.
  const src = [primary, ...(wikiImages && wikiImages.title === photo.wikiTitle ? wikiImages.urls : [])]
    .map((url) => safeUrl(url, true)).find((url) => url && !failedUrls.includes(url));
  // Nothing left to try: no working URL and Wikipedia already answered (or there is no title).
  const exhausted = !src && !primaryOk && (!photo.wikiTitle || wikiImages?.title === photo.wikiTitle);
  if (exhausted && hideIfMissing) return null;
  const href = safeUrl(photo.link);
  const image = src
    ? <img src={src} referrerPolicy="no-referrer" style={{ objectPosition: `${photo.focalX ?? 50}% 50%` }} alt={photo.alt ?? "Destination photograph"} onError={() => setFailedUrls((previous) => previous.includes(src) ? previous : [...previous, src])} />
    : <span className="tv-photo-placeholder" role="img" aria-label={photo.alt || "Photograph loading"}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg></span>;
  return <figure className="tv-photo">
    {href ? <a href={href} target="_blank" rel="noreferrer" aria-label={photo.alt}>{image}</a> : image}
    {bookmark && <button className={`tv-bookmark ${saved ? "is-saved" : ""}`} type="button" aria-label={`${saved ? "Unsave" : "Save"} ${photo.alt || "photograph"}`} aria-pressed={saved} onClick={() => setSaved(!saved)}>
      <svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4z"/></svg>
    </button>}
  </figure>;
}

export const TravelImage = defineComponent({
  name: "TravelImage",
  props: z.object({ src: z.string(), alt: z.string(), link: z.string().optional(), wikiTitle: z.string().optional(), focalX: z.number().min(0).max(100).optional() }),
  description: "One real destination image. Use a supplied URL; otherwise leave src empty and provide a Wikipedia article title as wikiTitle. Optional focalX (0–100) chooses the horizontal crop; default 50 centers it.",
  component: ({ props }) => <Photo photo={props} />,
});

export const TravelGallery = defineComponent({
  name: "TravelGallery",
  props: z.object({ images: z.array(TravelImage.ref).max(6) }),
  description: "A row of destination photographs. Usually three images, with consistent crops and working local save toggles.",
  component: function TravelGalleryComponent({ props }) {
    // Keep placeholders while URLs are still streaming in.
    const streaming = useIsStreaming();
    const photos = nodeProps<ImageData>(props.images);
    return <div className="tv-gallery">
      {photos.map((photo, i) => <Photo key={i} photo={photo} bookmark hideIfMissing={!streaming} />)}
    </div>;
  },
});

export type TravelStopData = StopData & { citations?: unknown[] };

/** The model's stops followed by any the user added from TravelSuggestions. */
function withAdded(stops: TravelStopData[], added: readonly TravelStopData[]) {
  const keys = new Set(stops.map(getStopKey));
  return [...stops, ...added.filter((stop) => !keys.has(getStopKey(stop)))];
}

function StopImage({ stop }: { stop: TravelStopData }) {
  return <Photo photo={{ src: stop.imageUrl || stop.photos?.[0], alt: stop.name, wikiTitle: stop.wikiTitle, focalX: stop.imageFocalX }} />;
}

export function TravelStopRow({ stop }: { stop: TravelStopData }) {
  const route = useRouteStore();
  const key = getStopKey(stop);
  const href = safeUrl(stop.link);
  const title = <>{stop.name}</>;
  const removed = !!key && route.isRemoved(key);
  return <article id={key ? route.stopId(key) : undefined} className={`tv-stop ${route.getSelected() === key ? "is-selected" : ""} ${removed ? "is-removed" : ""}`}>
    <StopImage stop={stop} />
    <div className="tv-stop-content">
      {(stop.time || route.isAdded(key)) && <div className="tv-stop-time">{stop.time}{route.isAdded(key) && <span className="tv-stop-tag">Added</span>}</div>}
      <h3 className="tv-stop-title">{href ? <a href={href} target="_blank" rel="noreferrer">{title}</a> : <button type="button" onClick={() => { route.selectStop(key); document.getElementById(`${route.mapId}-travel`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>{title}</button>}</h3>
      {(stop.description || stop.story) && <p className="tv-stop-description"><StreamingText text={stop.description || stop.story} />{nodeProps<CitationData>(stop.citations).map((citation, i) => <Citation key={`${citation.url}-${i}`} citation={citation} />)}</p>}
      {key && <button type="button" className="tv-stop-toggle" aria-pressed={removed} onClick={() => route.toggleStop(key)}>{removed ? "Add back" : "Remove from my route"}</button>}
    </div>
  </article>;
}

export const TravelStop = defineComponent({
  name: "TravelStop",
  props: z.object({
    id: z.string(), name: z.string(), time: z.string(), description: z.string(), imageUrl: z.string(),
    lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), emoji: z.string().describe("One emoji character for the map pin, e.g. 🌉 ⛴️ 🏛️ 🌳 — never a letter, number or symbol"), category: z.string(),
    link: z.string().optional(), wikiTitle: z.string().optional(), citations: z.array(TravelCitation.ref).optional(), imageFocalX: z.number().min(0).max(100).optional(),
  }),
  description: "A reusable destination with a stable id, visiting time, short practical description, real photo URL, coordinates, emoji and category. Reference the SAME stop in TravelMap and TravelItinerary. Omit unknown optional links; never invent images.",
  component: ({ props }) => <TravelStopRow stop={props} />,
});

export const TravelItinerary = defineComponent({
  name: "TravelItinerary",
  props: z.object({ title: z.string(), stops: z.array(TravelStop.ref).max(50) }),
  description: "A simple itinerary: heading followed by divided image/text rows. Reuse the stop references from TravelMap.",
  component: function TravelItineraryComponent({ props }) {
    const route = useRouteStore();
    const stops = withAdded(nodeProps<TravelStopData>(props.stops), route.getAdded());
    return <section className="tv-itinerary">
      {props.title && <h2 className="tv-heading tv-section-heading">{props.title}</h2>}
      <div className="tv-stop-list">{stops.map((stop, i) => <TravelStopRow key={getStopKey(stop) || `pending-${i}`} stop={stop} />)}</div>
    </section>;
  },
});

function SuggestionCard({ stop }: { stop: TravelStopData }) {
  const route = useRouteStore();
  const key = getStopKey(stop);
  const added = !!key && route.isAdded(key);
  return <article className="tv-suggestion">
    <StopImage stop={stop} />
    <div className="tv-suggestion-content">
      <h3 className="tv-stop-title">{stop.name}</h3>
      {stop.time && <div className="tv-stop-time">{stop.time}</div>}
    </div>
    <button type="button" className={`tv-suggestion-add ${added ? "is-added" : ""}`} disabled={!key || added || !coordinate(stop)} onClick={() => { route.addStop(stop); route.selectStop(key); }}>
      {added ? "Added to route" : "+ Add to my route"}
    </button>
  </article>;
}

export const TravelSuggestions = defineComponent({
  name: "TravelSuggestions",
  props: z.object({ title: z.string(), stops: z.array(TravelStop.ref).max(4) }),
  description: "Optional extra places the user can add to the route. Use 2–3 TravelStops that are NOT in the itinerary, each with its own unique id and a short duration such as \"+1 hr\" as its time. Adding one puts a pin on TravelMap and appends it to TravelItinerary.",
  component: ({ props }) => <section className="tv-suggestions">
    {props.title && <h2 className="tv-heading tv-section-heading">{props.title}</h2>}
    <div className="tv-suggestion-list">{nodeProps<TravelStopData>(props.stops).map((stop, i) => <SuggestionCard key={getStopKey(stop) || `pending-${i}`} stop={stop} />)}</div>
  </section>,
});

export const TravelMap = defineComponent({
  name: "TravelMap",
  props: z.object({
    stops: z.array(TravelStop.ref).max(50),
    route: z.array(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })).max(2000).optional(),
  }),
  description: "A real interactive street map with emoji destination markers, category filtering and expand. Reuse the SAME TravelStop refs in TravelItinerary. Optional route coordinates trace the supplied route; otherwise stops connect in visiting order as a route overview.",
  component: function TravelMapComponent({ props }) {
    const streaming = useIsStreaming();
    const route = useRouteStore();
    return <TravelMapView stops={withAdded(nodeProps<TravelStopData>(props.stops), route.getAdded())} path={props.route} streaming={streaming} />;
  },
});
