import { openuiChatPromptOptions } from "@openuidev/react-ui/genui-lib/prompt-options";

export const promptOptions = {
  ...openuiChatPromptOptions,
  examples: [
    ...(openuiChatPromptOptions.examples ?? []),
    `Example — Sightseeing route:

root = Card([header, map, stops, more, tips, customize])
header = CardHeader("Lisbon, your way", "Tap a pin to jump to its story")
map = RouteMap([s1, s2])
stops = RouteStops([s1, s2])
s1 = RouteStop("Belém Tower", "Belém Tower", 38.6916, -9.2160, "9:00 · 1 hr", "Built in the 1510s to guard the Tagus...", "Arrive before opening to skip the queue.")
s2 = RouteStop("Alfama", "Alfama", 38.7118, -9.1300, "11:00 · 2 hrs", "Lisbon's oldest district survived the 1755 earthquake...", "Wear grippy shoes for the steep lanes.")
more = RouteSuggestions("Add to your day", [x1, x2])
x1 = RouteStop("Jerónimos Monastery", "Jerónimos Monastery", 38.6979, -9.2068, "+1.5 hrs", "A 16th-century masterpiece of Manueline architecture...", "Buy a combined ticket with Belém Tower.")
x2 = RouteStop("LX Factory", "LX Factory", 38.7036, -9.1786, "+1 hr", "A 19th-century textile complex turned creative hub...", "Best on Sunday for the market.")
tips = Callout("info", "Getting around", "Tram 28 links most stops.")
customize = Form("customize", customizeBtns, [timeField, travelField, interestField])
timeField = FormControl("How much time do you have?", RadioGroup("time", [RadioItem("Half day", "4–5 hours", "half-day"), RadioItem("Full day", "8–10 hours", "full-day"), RadioItem("2 days", "A slower pace", "two-days")], "full-day"))
travelField = FormControl("How will you get around?", RadioGroup("travel", [RadioItem("Walking & public transport", "", "transit"), RadioItem("Walking & rideshare", "", "rideshare"), RadioItem("Rental car", "", "car")], "transit"))
interestField = FormControl("What interests you?", CheckBoxGroup("interests", [CheckBoxItem("Iconic landmarks", "", "landmarks", true), CheckBoxItem("Food & cafés", "", "food"), CheckBoxItem("Museums & culture", "", "culture"), CheckBoxItem("Parks & nature", "", "nature")]))
customizeBtns = Buttons([Button("Customize my itinerary", Action([@ToAssistant("Customize my Lisbon itinerary with these preferences")]), "primary")])`,
  ],
};
