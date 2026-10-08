"use client";

import { defineComponent } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import "../response-theme.css";
import "./route.css";
import { z } from "zod/v4";
import { RouteStoreProvider } from "./store";
import { TravelGallery, TravelHeading, TravelItinerary, TravelMap, TravelProse, TravelImage, TravelStop, TravelSuggestions, safeUrl } from "../travel/components";

const base = openuiChatLibrary.components.Card;
const baseChild = base.props.shape.children.element;

export const RouteCard = defineComponent({
  name: "Card",
  props: base.props.extend({
    children: z.array(z.union([...baseChild.options, TravelGallery.ref, TravelHeading.ref, TravelItinerary.ref, TravelSuggestions.ref, TravelMap.ref, TravelProse.ref, TravelImage.ref, TravelStop.ref])),
  }),
  description: "Vertical response container. Pass one array of content children. Travel citations belong inline in TravelProse/TravelStop, not in root sources.",
  component: ({ props, renderNode }) => <RouteStoreProvider><div className="openui-response rt-root">{renderNode(props.children)}
    {!!props.sources?.length && <nav className="tv-sources" aria-label="Response sources">{props.sources.map((source: { url?: string; title?: string; sourceName?: string } | null, i: number) => {
      const href = safeUrl(source?.url);
      return href && source ? <a key={`${href}-${i}`} href={href} target="_blank" rel="noreferrer">{i + 1}. {source.sourceName || source.title}</a> : null;
    })}</nav>}
  </div></RouteStoreProvider>,
});
