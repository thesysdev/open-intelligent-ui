import { createLibrary } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { RouteMap, RouteStop, RouteStops, RouteSuggestions } from "./route/components";
import { RouteCard } from "./route/root";

export const library = createLibrary({
  root: "Card",
  componentGroups: [
    ...(openuiChatLibrary.componentGroups ?? []),
    {
      name: "Travel",
      components: ["RouteMap", "RouteStops", "RouteSuggestions", "RouteStop"],
      notes: [
        "- For itineraries, day trips or sightseeing routes: CardHeader, then RouteMap([s1, s2, ...]), then RouteStops([s1, s2, ...]) using the same stop refs, then RouteSuggestions('Add to your day', [x1, x2]) with 2 extra stops not in the route, then an optional Callout with tips.",
        "- End a route with a 'Customize your route' Form (time available, how they'll get around, interests) whose primary Button uses Action([@ToAssistant(...)]) to ask for a rebuilt itinerary. The user's form choices are sent with the message, so on that next turn read them and return a new route that fits. Give each RadioGroup a default value and do not add required rules to the customize form: a pre-selected default does not count as filled in for required validation, so the button would do nothing.",
      ],
    },
  ],
  components: Object.values({ ...openuiChatLibrary.components, Card: RouteCard, RouteMap, RouteStops, RouteSuggestions, RouteStop }),
});
