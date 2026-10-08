import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { CardSourceProvider, Sources } from "@openuidev/react-ui";
import { z } from "zod/v4";
import { RouteMap, RouteStop, RouteStops, RouteSuggestions } from "./route/components";
import { learningComponents } from "./intelligent/learning";
import { BillSplitter, SavingsCalculator, RecipePlanner, WardrobePlanner } from "./intelligent/tools";
import { creativeComponents } from "./intelligent/creative";
import { RoadTripPlanner } from "./intelligent/roadtrip";

export const intelligentComponents = {
  ...learningComponents, BillSplitter, SavingsCalculator, RecipePlanner, WardrobePlanner, RoadTripPlanner, ...creativeComponents,
};
const baseCard = openuiChatLibrary.components.Card;
const baseChild = baseCard.props.shape.children.element;
const IntelligentCard = defineComponent({
  name: "Card",
  props: z.object({children: z.array(z.union([
    ...baseChild.options, RouteMap.ref, RouteStops.ref, RouteSuggestions.ref,
    ...Object.values(intelligentComponents).map(component => component.ref),
  ])), sources: baseCard.props.shape.sources}),
  description: "Root response container. Compose clear text, visualizations, interactive tools and everyday planning components. Avoid redundant headings when an interactive component already has a title.",
  component: ({props, renderNode}) => <CardSourceProvider sources={props.sources}><div className="rt-root">{renderNode(props.children)}<Sources /></div></CardSourceProvider>,
});

export const library = createLibrary({
  root: "Card",
  componentGroups: [
    ...(openuiChatLibrary.componentGroups ?? []),
    {
      name: "Travel",
      components: ["RouteMap", "RouteStops", "RouteSuggestions", "RouteStop"],
      notes: [
        "- For itineraries, day trips or sightseeing routes: CardHeader, then RouteMap([s1, s2, ...]), then RouteStops([s1, s2, ...]) using the same stop refs, then RouteSuggestions('Add to your day', [x1, x2]) with 2 extra stops not in the route, then an optional Callout with tips.",
      ],
    },
    {
      name: "Intelligent UI",
      components: Object.keys(intelligentComponents),
      notes: [
        "Choose the component that directly fits the question. Each interactive component includes its own heading and controls.",
        "Use RecipePlanner for scalable meal planning, BillSplitter for bills, SavingsCalculator for hypothetical savings, WardrobePlanner for outfits.",
        "Use RoadTripPlanner for the ten-day Pacific Northwest reference itinerary. For other destinations, compose the Travel components.",
        "Use BicycleExplorer for mechanics, BikeRepair for assembly steps, DistributionExplorer for statistics, EconomyExplorer for GDP, DroneMarket for drone businesses, MontyHall for probability and RetroGame for a playable arcade.",
        "Use RoomColorPreview for paint palettes, OrigamiGuide for paper folding, GardenPlanner for planting layouts. Do not invent live data or imply generated suggestions are verified facts.",
      ],
    },
  ],
  components: Object.values({ ...openuiChatLibrary.components, Card: IntelligentCard, RouteMap, RouteStops, RouteSuggestions, RouteStop, ...intelligentComponents }),
});
