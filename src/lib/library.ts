import { createLibrary } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
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
        "- For sightseeing and travel: TravelHeading (title), TravelProse, a three-photo TravelGallery, TravelMap and TravelItinerary sharing the same TravelStop refs, TravelSuggestions with 2–3 extra places not in the itinerary, transport advice in TravelProse, then the customize Form. Prefer a natural editorial response without nested cards, duplicate titles or decorative badges.",
      ],
    },
  ],
  components: Object.values({ ...openuiChatLibrary.components, Card: RouteCard, TravelHeading, TravelCitation, TravelProse, TravelImage, TravelGallery, TravelStop, TravelItinerary, TravelMap, TravelSuggestions }),
});
