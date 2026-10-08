import { createLibrary } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { RouteMap, RouteStop, RouteStops, RouteSuggestions } from "./route/components";
import { RouteCard } from "./route/root";
import { TravelHeading, TravelCitation, TravelProse, TravelImage, TravelGallery, TravelStop, TravelItinerary, TravelMap, TravelSuggestions } from "./travel/components";

export const library = createLibrary({
  root: "Card",
  componentGroups: [
    ...(openuiChatLibrary.componentGroups ?? []),
    {
      name: "Travel",
      components: ["TravelHeading", "TravelCitation", "TravelProse", "TravelImage", "TravelGallery", "TravelStop", "TravelItinerary", "TravelMap", "TravelSuggestions"],
      notes: [
        "- For travel: TravelHeading, TravelProse, a three-photo TravelGallery, TravelMap and TravelItinerary sharing identical TravelStop refs, then TravelSuggestions with 2–3 extra places not in the itinerary (each its own TravelStop with a unique id), followed by transport advice. Card accepts all display components. Use image_search once with queries for the destination photos and stops, and copy returned Image URLs exactly into TravelImage.src and TravelStop.imageUrl. If no image is returned, leave src empty and use wikiTitle. Finish with a Customize your route Form using the standard form components and an @ToAssistant primary action. Read the submitted form values when rebuilding the route.",
      ],
    },
  ],
  components: Object.values({ ...openuiChatLibrary.components, Card: RouteCard, RouteMap, RouteStop, RouteStops, RouteSuggestions, TravelHeading, TravelCitation, TravelProse, TravelImage, TravelGallery, TravelStop, TravelItinerary, TravelMap, TravelSuggestions }),
});
