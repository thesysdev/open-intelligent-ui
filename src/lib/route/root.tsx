"use client";

import { defineComponent } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { z } from "zod/v4";
import { RouteMap, RouteStops, RouteSuggestions } from "./components";

const base = openuiChatLibrary.components.Card as any;
const baseChild = base.props.shape.children.element;

export const RouteCard = defineComponent({
  name: "Card",
  props: z.object({
    children: z.array(z.union([...baseChild.options, RouteMap.ref, RouteStops.ref, RouteSuggestions.ref] as any)),
  }),
  description: base.description,
  component: ({ props, renderNode }) => <div className="rt-root">{renderNode(props.children)}</div>,
});
