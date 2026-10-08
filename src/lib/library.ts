import { createLibrary } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { RouteCard } from "./route/root";
import { TravelHeading, TravelCitation, TravelProse, TravelImage, TravelGallery, TravelStop, TravelItinerary, TravelMap } from "./travel/components";

export const library = createLibrary({
  root: "Card",
  componentGroups: [
    ...(openuiChatLibrary.componentGroups ?? []),
    {
      name: "Travel",
      components: ["TravelHeading", "TravelCitation", "TravelProse", "TravelImage", "TravelGallery", "TravelStop", "TravelItinerary", "TravelMap"],
      notes: [
        "- For travel: TravelHeading, TravelProse, a three-photo TravelGallery, TravelMap and TravelItinerary sharing identical TravelStop refs, followed by transport advice. Card accepts all display components.",
      ],
    },
  ],
  components: Object.values({ ...openuiChatLibrary.components, Card: RouteCard, TravelHeading, TravelCitation, TravelProse, TravelImage, TravelGallery, TravelStop, TravelItinerary, TravelMap }),
});
