import { openuiChatPromptOptions } from "@openuidev/react-ui/genui-lib/prompt-options";

export const promptOptions = {
  ...openuiChatPromptOptions,
  additionalRules: [
    ...(openuiChatPromptOptions.additionalRules ?? []),
    "Create clear, thoughtful answers in the OpenAI Intelligent UI visual style using this library. Prefer the purpose-built interactive component whenever it fits the question; do not simulate its controls in prose.",
    "For statistics, GDP, drone business, probability, bikes, paint colors, origami, gardens, savings, meal planning, wardrobe or bill splitting, choose the matching Intelligent UI component. Their controls run locally and need no tools.",
    "Each Intelligent UI component contains its own title. Do not duplicate that title in a CardHeader directly above it. A concise TextContent introduction and one relevant FollowUpBlock are sufficient.",
    "The interactive learning and creative components have built-in illustrative datasets. Frame them as examples. Do not present the built-in drone market figures or savings results as current verified data or guaranteed returns.",
    "Only use RouteMap for actual location-based routes, and include real coordinates and exact Wikipedia titles. Reuse stop references between the map and stop list. Assign a helpful optional category such as Landmarks, History, Culture or Nature.",
    "Use RoadTripPlanner for the ten-day Pacific Northwest example. Its itinerary is specific to that region; use the Travel components for other destinations.",
    "For meal planning provide numeric ingredient quantities tied to baseGuests, practical checklist steps and descriptive dish cards. For bill splitting people indices are zero-based, and every item must have at least one person assigned.",
  ],
  examples: [
    ...(openuiChatPromptOptions.examples ?? []),
    `Example — Pacific Northwest road trip:
root = Card([trip])
trip = RoadTripPlanner("Ten days in the Pacific Northwest")`,
    `Example — Interactive explanation:
root = Card([intro, explorer])
intro = TextContent("A bicycle is five connected systems. Select a part below to explore how it works.")
explorer = BicycleExplorer("7-speed bicycle")`,
    `Example — Learn probability:
root = Card([game])
game = MontyHall("Should you switch doors?")`,
    `Example — Statistics simulation:
root = Card([simulation])
simulation = DistributionExplorer("The central limit theorem")`,
    `Example — Economy:
root = Card([economy])
economy = EconomyExplorer("What makes up GDP?")`,
    `Example — Drone photography market:
root = Card([market])
market = DroneMarket("The business of drone photography")`,
    `Example — Choose a room color:
root = Card([preview])
preview = RoomColorPreview("Find your room’s next color")`,
    `Example — Origami:
root = Card([guide])
guide = OrigamiGuide("Let’s fold an origami baby fox!")`,
    `Example — Garden:
root = Card([garden])
garden = GardenPlanner("Your small-space garden")`,
    `Example — Bicycle assembly:
root = Card([guide])
guide = BikeRepair("Rocket youth bike")`,
    `Example — Retro arcade:
root = Card([game])
game = RetroGame("A little break", "snake")`,
    `Example — Savings:
root = Card([calculator])
calculator = SavingsCalculator("Your retirement, in perspective", "USD", 10000, 500, 30, 5)`,
    `Example — Split a bill:
root = Card([bill])
bill = BillSplitter("Dinner with friends", "USD", ["You", "Alex", "Sam"], [{name: "Dinner", amount: 90, people: [0, 1, 2]}, {name: "Dessert", amount: 18, people: [0, 2]}], 8, 20)`,
    `Example — Sightseeing route:

root = Card([header, map, stops, more, tips])
header = CardHeader("Lisbon, your way", "Tap a pin to jump to its story")
map = RouteMap([s1, s2])
stops = RouteStops([s1, s2])
s1 = RouteStop("Belém Tower", "Belém Tower", 38.6916, -9.2160, "9:00 · 1 hr", "Built in the 1510s to guard the Tagus...", "Arrive before opening to skip the queue.")
s2 = RouteStop("Alfama", "Alfama", 38.7118, -9.1300, "11:00 · 2 hrs", "Lisbon's oldest district survived the 1755 earthquake...", "Wear grippy shoes for the steep lanes.")
more = RouteSuggestions("Add to your day", [x1, x2])
x1 = RouteStop("Jerónimos Monastery", "Jerónimos Monastery", 38.6979, -9.2068, "+1.5 hrs", "A 16th-century masterpiece of Manueline architecture...", "Buy a combined ticket with Belém Tower.")
x2 = RouteStop("LX Factory", "LX Factory", 38.7036, -9.1786, "+1 hr", "A 19th-century textile complex turned creative hub...", "Best on Sunday for the market.")
tips = Callout("info", "Getting around", "Tram 28 links most stops.")`,
  ],
};
