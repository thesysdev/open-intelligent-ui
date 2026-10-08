import { openuiChatPromptOptions } from "@openuidev/react-ui/genui-lib/prompt-options";

export const promptOptions = {
  ...openuiChatPromptOptions,
  examples: [
    `Example — a flexible sightseeing response. All content and destinations are supplied by the model, never a city-specific UI template:
root = Card([title, intro, gallery, map, itinerary, advice])
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
advice = TravelProse("Take a taxi between Belém and Alfama, then continue on foot.")`,
  ],
  additionalRules: ["For normal travel requests, run image search before writing the route. Copy the returned image URLs exactly into TravelImage.src and TravelStop.imageUrl; use Wikipedia fallback only when no result is available. If the user wants to personalize or adjust a route, use the existing Form, FormControl, RadioGroup and CheckBoxGroup components, with an Action([@ToAssistant(...)]) submit button to generate an updated itinerary. Give radio groups defaults and avoid required rules on preselected options.", `For sightseeing and travel requests, compose TravelHeading, TravelProse, TravelGallery, TravelMap and TravelItinerary inside Card. Use the same TravelStop references in the map and itinerary. Each stop must have a stable unique ID, plausible coordinates, useful times and a concise description. Use wikiTitle for automatic photos when an actual image URL is unavailable; do not invent image URLs. Always include a three-photo TravelGallery for sightseeing: if URLs are unavailable, pass empty src and a real Wikipedia title in each TravelImage's fourth argument. Prefer a natural editorial response, without nested cards, duplicate titles or decorative badges. Finish with useful transport advice and one relevant follow-up question. Do not assert current event schedules, opening times, weather or fares as verified without provided evidence. Other requests may use any registered component.`],
};
