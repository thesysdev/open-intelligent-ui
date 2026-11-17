"use client";

import { defineComponent } from "@openuidev/react-lang";
import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod/v4";
import { withBase } from "../base-path";
import { cx, radius, radiusSchema, webUrl } from "./style";

// The published library's photo class: a Row sets a photo with it beside text (a media row).
const PHOTO_MARKER = "openui-intelligent-photo";

// Image search
const searches = new Map<string, Promise<string[]>>();

async function getJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  return response.ok ? ((await response.json()) as Record<string, unknown>) : {};
}

const urls = (value: unknown) => (Array.isArray(value) ? value.flatMap((u) => (webUrl(u) ? [u as string] : [])) : []);

/**
 * Photo URLs for a query: the Wikipedia article with that exact title first
 * (/api/wiki: right for a named place, dish or product), then a Wikipedia and
 * Commons search (/api/image-search). Failures are retried next time.
 */
function searchImages(query: string): Promise<string[]> {
  let request = searches.get(query);
  if (!request) {
    request = Promise.all([
      getJson(withBase(`/api/wiki?title=${encodeURIComponent(query)}`)).catch((): Record<string, unknown> => ({})),
      getJson(withBase(`/api/image-search?q=${encodeURIComponent(query)}`)).catch((): Record<string, unknown> => ({})),
    ]).then(([wiki, found]) => {
      const all = [...urls(wiki.photos), ...urls(found.images)];
      if (!all.length) searches.delete(query);
      return [...new Set(all)];
    });
    if (searches.size > 200) searches.delete(searches.keys().next().value!);
    searches.set(query, request);
  }
  return request;
}

/** Search results for `query`, or undefined while waiting. The query settles first: it may still be streaming. */
function useImageSearch(query: string | null): string[] | undefined {
  const [result, setResult] = useState<{ query: string; images: string[] } | null>(null);
  useEffect(() => {
    if (!query) return;
    let active = true;
    const timer = setTimeout(() => {
      searchImages(query).then((images) => {
        if (active) setResult({ query, images });
      });
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);
  return query && result?.query === query ? result.images : undefined;
}

type PhotoProps = { query: string; aspectRatio?: number | null; radius?: unknown; fit?: string | null };

/** The best search result for query, moving on to the next when one fails to load. */
function Photo(props: PhotoProps) {
  const alt = typeof props.query === "string" ? props.query.trim() : "";
  const [failed, setFailed] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<string | null>(null);
  const needSearch = alt.length > 2;
  const found = useImageSearch(needSearch ? alt : null);
  const current = found?.find((url) => !failed.includes(url));
  const settled = !current && (!needSearch || found !== undefined);
  const ratio = typeof props.aspectRatio === "number" && props.aspectRatio > 0.2 && props.aspectRatio < 5 ? props.aspectRatio : 1.5;
  return (
    <div
      className={cx("iui-image", PHOTO_MARKER, props.fit === "contain" && "is-contain", loaded === current && "is-loaded")}
      style={{ aspectRatio: ratio, borderRadius: radius(props.radius ?? "lg") }}
      role={current ? undefined : "img"}
      aria-label={current ? undefined : alt}
    >
      {current ? (
        <img
          key={current}
          src={current}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(current)}
          onError={() => setFailed((list) => [...list, current])}
        />
      ) : settled ? (
        <ImageIcon aria-hidden className="iui-image-empty" strokeWidth={1.5} />
      ) : null}
    </div>
  );
}

const fit = z.enum(["cover", "contain"]).optional();

export const SearchImage = defineComponent({
  name: "SearchImage",
  props: z.object({ query: z.string(), aspectRatio: z.number().optional(), radius: radiusSchema.optional(), fit }),
  description:
    'A real photo the app finds for query; it needs no URL and no tool. Name the exact thing in 2 to 4 words: "Belém Tower Lisbon", "iPhone 17", "pastel de nata". Use one for every place, dish, product or thing with a look.',
  component: ({ props }) => <Photo {...props} />,
});
