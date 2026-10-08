import { openuiChatPromptOptions } from "@openuidev/react-ui/genui-lib/prompt-options";

export const promptOptions = {
  ...openuiChatPromptOptions,
  examples: [
    `Example — a flexible sightseeing response. All content and destinations are supplied by the model, never a city-specific UI template:
root = Card([title, intro, gallery, map, itinerary, advice, customize])
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
advice = TravelProse("Take a taxi between Belém and Alfama, then continue on foot.")
customize = Form("customize", customizeButtons, [timeField, travelField, interestField])
timeField = FormControl("How much time do you have?", RadioGroup("time", [RadioItem("Half day", "4–5 hours", "half-day"), RadioItem("Full day", "8–10 hours", "full-day")], "full-day"))
travelField = FormControl("How will you get around?", RadioGroup("travel", [RadioItem("Walking & public transport", "", "transit"), RadioItem("Walking & rideshare", "", "rideshare")], "transit"))
interestField = FormControl("What interests you?", CheckBoxGroup("interests", [CheckBoxItem("Landmarks", "", "landmarks", true), CheckBoxItem("Food & cafés", "", "food"), CheckBoxItem("Parks & nature", "", "nature")]))
customizeButtons = Buttons([Button("Personalize my trip", Action([@ToAssistant("Customize my Lisbon itinerary with these preferences")]), "primary")])`,
  ],
  additionalRules: ["For normal travel requests, run image search before writing the route. Copy the returned image URLs exactly into TravelImage.src and TravelStop.imageUrl; use Wikipedia fallback only when no result is available. If the user wants to personalize or adjust a route, use the existing Form, FormControl, RadioGroup and CheckBoxGroup components, with an Action([@ToAssistant(...)]) submit button to generate an updated itinerary. Give radio groups defaults and avoid required rules on preselected options.", `For sightseeing and travel requests, compose TravelHeading, TravelProse, TravelGallery, TravelMap and TravelItinerary inside Card. Use the same TravelStop references in the map and itinerary. Each stop must have a stable unique ID, plausible coordinates, useful times and a concise description. Before writing a sightseeing route, run image_search with one query per stop. Copy the returned Image URLs exactly into TravelImage.src and TravelStop.imageUrl. When no image is found, leave src empty and provide wikiTitle for the Wikipedia fallback. Never invent or edit image URLs. Always include a three-photo TravelGallery for sightseeing: if URLs are unavailable, pass empty src and a real Wikipedia title in each TravelImage's fourth argument. Prefer a natural editorial response, without nested cards, duplicate titles or decorative badges. Finish with useful transport advice and a Customize your route Form (time, transport, interests). Use short option labels with empty descriptions for compact pill choices. Add a section-level TravelHeading before the Form. Use a RadioGroup default that exactly matches one option value, no required rules, and a primary @ToAssistant action. On follow-up, use the submitted values to rebuild the route. Emit TravelMap before defining the stops so its pins can appear progressively. Do not assert current event schedules, opening times, weather or fares as verified without provided evidence. Other requests may use any registered component.`],
};
