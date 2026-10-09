import { openuiChatPromptOptions } from "@openuidev/react-ui/genui-lib/prompt-options";

// With OpenUI Gateway, its hosted image_search tool finds photos for each place.
const IMAGE_SEARCH_RULE = "Travel images: before writing a sightseeing route, run image_search once with one query per stop and per suggestion. Copy returned Image URLs exactly into TravelImage.src and TravelStop.imageUrl; never invent or edit image URLs. When a place has no result, leave the URL empty and give its exact Wikipedia title as wikiTitle.";
// Local models (Ollama) have no image search; photos come from the Wikipedia fallback.
const NO_IMAGE_SEARCH_RULE = "Travel images: no image search is available. Leave TravelImage.src and TravelStop.imageUrl empty and give every place its exact English Wikipedia article title as wikiTitle; photos are loaded from Wikipedia.";

export const promptOptions = {
  ...openuiChatPromptOptions,
  examples: [
    ...(openuiChatPromptOptions.examples ?? []),
    `Example — a flexible sightseeing response. All content and destinations are supplied by the model, never a city-specific UI template:
root = Card([title, intro, gallery, map, itinerary, more, advice, customize])
title = TravelHeading("An afternoon in Lisbon", "title")
intro = TravelProse("Start by the river, then explore **Alfama on foot**.")
gallery = TravelGallery([photo1, photo2, photo3])
photo1 = TravelImage("", "Belém Tower by the river", "", "Belém Tower")
photo2 = TravelImage("", "Alfama streets", "", "Alfama")
photo3 = TravelImage("", "Lisbon architecture", "", "Lisbon")
map = TravelMap([s1, s2])
itinerary = TravelItinerary("Your itinerary", [s1, s2])
s1 = TravelStop("belem", "Belém Tower", "1:00–2:00 PM", "Explore the historic waterfront.", "", 38.6916, -9.2160, "🏰", "Landmarks", "", "Belém Tower")
s2 = TravelStop("alfama", "Alfama", "3:00–5:00 PM", "Take your time in the old streets.", "", 38.7118, -9.1300, "🚋", "Neighborhoods", "", "Alfama")
more = TravelSuggestions("Add to your day", [x1, x2])
x1 = TravelStop("jeronimos", "Jerónimos Monastery", "+1.5 hrs", "A Manueline masterpiece next to Belém Tower.", "", 38.6979, -9.2068, "⛪", "Landmarks", "", "Jerónimos Monastery")
x2 = TravelStop("lx-factory", "LX Factory", "+1 hr", "Shops and cafés in a former textile complex.", "", 38.7036, -9.1786, "🛍️", "Neighborhoods", "", "LX Factory")
advice = TravelProse("Take a taxi between Belém and Alfama, then continue on foot.")
customize = Form("customize", customizeButtons, [timeField, travelField, interestField])
timeField = FormControl("How much time do you have?", RadioGroup("time", [RadioItem("Half day", "4–5 hours", "half-day"), RadioItem("Full day", "8–10 hours", "full-day")], "full-day"))
travelField = FormControl("How will you get around?", RadioGroup("travel", [RadioItem("Walking & public transport", "", "transit"), RadioItem("Walking & rideshare", "", "rideshare")], "transit"))
interestField = FormControl("What interests you?", CheckBoxGroup("interests", [CheckBoxItem("Landmarks", "", "landmarks", true), CheckBoxItem("Food & cafés", "", "food"), CheckBoxItem("Parks & nature", "", "nature")]))
customizeButtons = Buttons([Button("Personalize my trip", Action([@ToAssistant("Customize my Lisbon itinerary with these preferences")]), "primary")])`,
  ],
  additionalRules: [
    ...(openuiChatPromptOptions.additionalRules ?? []),
    IMAGE_SEARCH_RULE,
    "Travel stops: each TravelStop needs a unique id, plausible coordinates, a useful time and a concise description. Emit TravelMap before the stop definitions so its pins appear while streaming.",
    "Customize your route: end a travel answer with a section TravelHeading and a Form (time, transport, interests) using short option labels with empty descriptions. Give each RadioGroup a default that exactly matches an option value, add no required rules, and use one primary Button with Action([@ToAssistant(...)]). On the next turn, rebuild the route from the submitted values.",
    "Route edits: an earlier answer may end with \"(User's edits to this route: ...)\" listing TravelStop ids the user removed and places they added. Treat that edited route as the current one in follow-ups and rebuilt itineraries.",
    "Do not present opening times, event schedules, weather or fares as verified without evidence.",
  ],
};

/** The same options for a local model: no image search, so photos come from Wikipedia. */
export const localPromptOptions = {
  ...promptOptions,
  additionalRules: promptOptions.additionalRules.map((rule) => (rule === IMAGE_SEARCH_RULE ? NO_IMAGE_SEARCH_RULE : rule)),
};
