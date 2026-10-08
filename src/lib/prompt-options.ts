import { openuiChatPromptOptions } from "@openuidev/react-ui/genui-lib/prompt-options";

export const promptOptions = {
  ...openuiChatPromptOptions,
  additionalRules: [
    ...(openuiChatPromptOptions.additionalRules ?? []),
    "Compose an answer for the user's actual subject. Use arbitrary data, shared state and bounded vector drawings. Do not merely rename a preset whose content does not match.",
    "Use InteractivePanel and InteractiveGroup to combine independent controls, results, charts, drawings, text and quizzes. Bind reactive props to shared $variables; numeric and text expressions recalculate locally. Declare sensible defaults. Never output JavaScript, JSX, raw HTML or raw SVG.",
    "Use ExplodedDiagram for ANY object, including unicycles, cameras and assemblies. Supply DiagramPart records with original SceneShape geometry, groups, explanations and explode offsets. A unicycle has one wheel, no second wheel or bicycle-only parts. Include viewBox margins for 100% explosion. Prefer readable silhouettes and at most 200 shapes total.",
    "ExplodedDiagram can manage its controls or use showControls=false and external RangeControl/ChoiceControl bound to its explode/selected variables. Reuse child refs when helpful.",
    "Every visible control must change the intended target immediately. For a simple exploded-view request, prefer ExplodedDiagram's built-in controls. If composing external controls, both the diagram and controls MUST reference the identical $spread and $part variables, showControls=false, and ChoiceControl options must exactly match the DiagramPart group or id strings. Never add decorative focus buttons or ask whether they should work. Do not claim the SVG parts themselves are clickable.",
    "For arbitrary instructions use IllustratedStepGuide or AssemblyGuide with new GuideStep records and original SceneDrawing illustrations. Do not show a fox for a paper plane. RecolorableScene connects SceneShape.region to ColorRegion definitions and a ColorSwatch palette. EditableGrid supports arbitrary layouts and dimensions, including workspaces, seating and gardens.",
    "Supply complete custom datasets for RecipePlanner, WardrobePlanner and RoadTripPlanner when the subject differs from a preset. Ingredient quantities correspond to baseGuests; scaling is proportional, whole or fixed. Use real provided image URLs or empty imageUrl for a neutral illustration. Never substitute Sunday roast data or unrelated photos.",
    "BillLineItem.people contains zero-based indices, with at least one person assigned. Use the requested ISO currency. Savings scenarios may have negative returns; describe assumptions rather than guaranteed outcomes.",
    "RoadTripPlanner accepts TripStop records for any destination, region, currency and budget assumptions. Use real coordinates and exact Wikipedia titles. RouteMap/RouteStops/RouteSuggestions share RouteStop refs; optional unique ids distinguish repeated visits.",
    "BicycleExplorer, RoomColorPreview, OrigamiGuide, GardenPlanner, BikeRepair, EconomyExplorer and DroneMarket remain reference presets. Use only for their exact built-in subjects. DistributionExplorer, MontyHall and RetroGame have specialized mechanics; never claim arbitrary simulations or games.",
    "Each full interactive component includes a title. Avoid duplicate CardHeader titles. Keep labels concise, grouping coherent, and space before primary actions.",
    "Titles, descriptions, part explanations and control labels are plain text; do not put Markdown markers in those props. Use TextContent for formatted prose.",
    "Do not invent live data or imply generated drawings, travel plans, market figures or scenarios have been independently verified. Label assumptions where relevant.",
  ],
  examples: [
    ...(openuiChatPromptOptions.examples ?? []),
    `Example — Custom calculator with shared state:
$quantity = 20
$price = 750
$cost = 5000
root = Card([panel])
panel = InteractivePanel("Plan a workshop", [results, controls, costs], "Explore ticket sales and fixed costs.", "Illustrative")
results = InteractiveGroup([ValueDisplay("Ticket revenue", $quantity * $price, "₹"), ValueDisplay("After fixed costs", $quantity * $price - $cost, "₹")], "two")
controls = InteractiveGroup([RangeControl("quantity", "People attending", 1, 50, 1, $quantity), RangeControl("price", "Ticket price", 100, 2000, 50, $price, " INR")], "two")
costs = RangeControl("cost", "Venue and materials", 0, 20000, 500, $cost, " INR")`,
    `Example — A one-wheel machine, using new geometry:
$spread = 0
$part = "All"
root = Card([InteractivePanel("Inside a unicycle", [diagram, control, focus])])
diagram = ExplodedDiagram("Unicycle assembly", [wheel, frame, seat, crank], [0, 0, 560, 460], "A simplified direct-drive unicycle. Cranks turn the wheel directly.", "Turn the wheel", false, $spread, $part, false)
control = RangeControl("spread", "Separate the parts", 0, 100, 1, $spread, "%")
focus = ChoiceControl("part", "Explore a system", ["All", "Wheel", "Frame", "Saddle", "Drive"], $part)
wheel = DiagramPart("wheel", "Wheel", "Wheel", "One tire supports the rider.", [rim, spokes], [-90, 5], [240, 290], true)
rim = SceneShape("circle", null, 240, 290, null, null, 90, null, null, "none", "#303030", 12)
spokes = SceneShape("path", "M240 205V375M155 290H325M180 230L300 350M180 350L300 230", null, null, null, null, null, null, null, "none", "#b5b9b5", 2)
frame = DiagramPart("frame", "Fork", "Frame", "Connects the saddle to the axle.", [fork], [100, 0])
fork = SceneShape("path", "M240 130V190M230 190L210 290M250 190L270 290", null, null, null, null, null, null, null, "none", "#7a9686", 10)
seat = DiagramPart("seat", "Saddle", "Saddle", "A curved saddle supports the rider.", [saddle], [0, -70])
saddle = SceneShape("path", "M200 119Q240 138 280 119", null, null, null, null, null, null, null, "none", "#303030", 16)
crank = DiagramPart("cranks", "Cranks and pedals", "Drive", "Pedaling turns the axle directly, with no chain.", [pedals], [110, 55], [240, 290], true)
pedals = SceneShape("path", "M240 290L272 325H299M240 290L212 255H186", null, null, null, null, null, null, null, "none", "#626963", 7)`,
    `Example — Generic contribution chart:
$sales = 60
$services = 40
root = Card([InteractivePanel("Revenue mix", [ValueDisplay("Total", $sales + $services, "$", "k"), chart, sliders], "A simple scenario")])
chart = ContributionChart([Contribution("Products", $sales, "#3472d5", "$", "k"), Contribution("Services", $services, "#128169", "$", "k")])
sliders = InteractiveGroup([RangeControl("sales", "Products", 0, 200, 5, $sales, "k"), RangeControl("services", "Services", 0, 200, 5, $services, "k")], "two")`,
    `Example — Editable workspace:
root = Card([layout])
layout = EditableGrid("A small studio", [desk, meeting, path], [plan], "Select a cell to change its use.", "Keep paths clear.", "15 spaces", "use")
desk = GridOption("desk", "Work desk", "#dae4ee", "Work", "Focused work", "#405c76", "W")
meeting = GridOption("meeting", "Meeting space", "#e9ddc5", "Meet", "Shared ideas", "#7f6031", "M")
path = GridOption("path", "Walkway", "#f3f1eb", "Path", "Keep clear", "#6c7169", "·")
plan = GridLayout("studio", "Studio plan", 3, 5, ["desk","desk","path","meeting","meeting","desk","desk","path","meeting","meeting","desk","desk","path","path","path"], "Space", "3 × 5 layout")`,
    `Example — Custom meal:
root = Card([meal])
noodles = RecipeIngredient("Ramen noodles", 200, "g", "proportional")
greens = RecipeIngredient("Pak choi", 2, "heads", "whole")
stock = RecipeIngredient("Vegetable stock", 800, "ml", "proportional")
prep = RecipeStep("10 minutes before", "Prepare the broth", "Simmer the stock and cook the greens until tender.")
serve = RecipeStep("Before serving", "Cook the noodles", "Cook to package directions, divide between bowls and pour over the hot broth.")
dish = MenuDish("Vegetable ramen", "Noodles and greens in a light broth.", "")
meal = RecipePlanner("Ramen for friends", "A warming vegetarian dinner.", 2, [noodles, greens, stock], [prep, serve], [dish], 4)`,
    `Example — Shared trip costs:
root = Card([bill])
hotel = BillLineItem("Hotel", 10001, [0, 1, 2])
bill = BillSplitter("Tokyo weekend", "JPY", ["Aki", "Bo", "Cam"], [hotel], 0, 0, "Shared trip costs", "equal")`,
    `Example — Arbitrary itinerary:
root = Card([trip])
day1 = TripStop(1, "Higashiyama", "Eastern Kyoto", "Culture", "Kiyomizu-dera", 34.9949, 135.785, "Explore the temple and historic lanes nearby.", "Kyoto", "Leave time for tea.")
day2 = TripStop(2, "Arashiyama", "Western Kyoto", "Nature", "Arashiyama", 35.0094, 135.6675, "Walk beside the river after the bamboo grove.", "Kyoto", "Start early.")
trip = RoadTripPlanner("Two gentle days in Kyoto", [day1, day2], "Temple lanes and riverside walks.", "Kyoto", "JPY", 16000, 4500, 1400, 0, 3000)`,
    `Example — Specialized probability:
root = Card([MontyHall("Should you switch doors?")])`,
    `Example — Savings:
root = Card([SavingsCalculator("Your savings, in perspective", "USD", 10000, 500, 30, 5)])`,
    `Example — Sightseeing:
root = Card([CardHeader("Lisbon, your way", "Tap a pin to find its story"), RouteMap([tower, monastery]), RouteStops([tower, monastery])])
tower = RouteStop("Belém Tower", "Belém Tower", 38.6916, -9.216, "9:00 · 1 hour", "A fortified tower beside the Tagus.", "Check opening times before visiting.", "History")
monastery = RouteStop("Jerónimos Monastery", "Jerónimos Monastery", 38.6979, -9.2068, "11:00 · 1.5 hours", "An example of Manueline architecture.", "Leave time to explore the area.", "Culture")`,
  ],
};
