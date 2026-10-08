/** Explicit, opt-in reference context for a controlled film take; the model still generates every response token. */
export const SF_RECORDING_PROMPT = "I'm in San Francisco for a day, plan a sightseeing route for me";

export const SF_RECORDING_FOLLOWUPS = [
  "Move Golden Gate Bridge to sunset",
  "Add a lunch stop",
  "Avoid steep walks",
  "Find the best photo spots",
] as const;

// Native FollowUpItem wraps its label in the SDK's content/context envelope.
// The controlled preset only uses the visible label, never client-supplied context.
export function recordingMessageText(content: string) {
  const wrapped = content.match(/^\]\]>openui:content\r?\n([\s\S]*?)(?:\r?\n\]\]>openui:context\r?\n[\s\S]*)?$/);
  return (wrapped?.[1] ?? content).trim();
}

export function isRecordingConversation(messages: { role: string; content: string }[]) {
  if (messages[0]?.role !== "user" || recordingMessageText(messages[0].content) !== SF_RECORDING_PROMPT) return false;
  return messages.every((message, index) => message.role !== "user" || index === 0 ||
    (messages.slice(0, index).some((previous) => previous.role === "assistant") &&
      SF_RECORDING_FOLLOWUPS.some((followup) => followup === recordingMessageText(message.content))));
}

export const sfRecordingContext = `You are producing the right side of a controlled comparison recording. This is reference context, not a cached response: generate the complete OpenUI response through the live stream. Reproduce the supplied content and image choices exactly in this order, with the reusable Travel components. Do not mention this production instruction in the response. The historical itinerary date is October 8, 2026; do not reinterpret 'today' using another date.

Emit root first: Card([title,intro,gallery,note,map,itinerary,gettingAround,transport,pace,extra,question,followups]). Then emit title, intro, gallery and its three image definitions, and note. Next emit map = TravelMap([s1,s2,s3,s4,s5,s6,s7,s8,s9]) BEFORE defining any stops so the map appears immediately and each real stop can populate as it streams. Then define s1 through s9 in order. After the stops, emit itinerary and advice. Reuse the identical stop variables in TravelMap and TravelItinerary. TravelStop order: id,name,time,description,imageUrl,lat,lng,emoji,category,link,wikiTitle,citations,imageFocalX. Use no CardHeader, nested Cards, Callouts, ActionButtons, summary or extra prose. The only follow-ups are the four requested FollowUpItem options at the end. The map/list must have exactly 9 stops. At the end of the FIRST response, use the native OpenUI follow-up components exactly: followups = FollowUpBlock([f1,f2,f3,f4]); f1 = FollowUpItem("Move Golden Gate Bridge to sunset"); f2 = FollowUpItem("Add a lunch stop"); f3 = FollowUpItem("Avoid steep walks"); f4 = FollowUpItem("Find the best photo spots").

Title: San Francisco in one day
Intro: I'd plan a **9 AM–7 PM route** that starts downtown, takes you through the city's iconic streets and waterfront, and finishes with panoramic views at sunset.
Gallery (exactly these 3 TravelImage refs; pass empty link/wikiTitle and the specified focalX as the fifth argument):
/recording/sf/hero-bridge.jpg | Golden Gate Bridge from the beach | focalX 0
/recording/sf/hero-lombard.jpg | Lombard Street from above | focalX 100
/recording/sf/hero-palace.jpg | Palace of Fine Arts and reflecting lagoon | focalX 53.5
Note: **There's a bonus if you're going today, Thursday, October 8:** it's Fleet Week, and the Blue Angels are scheduled to practice between 1 PM and 5 PM. I'd time your waterfront visit to give you a chance to see the jets.
Note citation: San Francisco Chronicle | https://www.sfchronicle.com/ | /recording/sf/sfchronicle.png

Stops (each has category 'Sightseeing', empty link/wikiTitle, and exact local image path):
1. ferry | Ferry Building | 9:00–9:45 AM | Coffee, breakfast and a waterfront walk to start the day. | /recording/sf/ferry-building.jpg | 37.7955,-122.3937 | ☕
2. chinatown | Chinatown + cable car | 9:45–11:15 AM | Explore Grant Avenue, then walk to Powell & California and catch the Powell–Hyde cable car toward Lombard Street. | /recording/sf/chinatown.jpg | 37.7907,-122.4056 | 🏮
3. lombard | Lombard Street | 11:15 AM–12:00 PM | Walk down the winding block, then head downhill toward Fisherman's Wharf. | /recording/sf/lombard.jpg | 37.8021,-122.4187 | 🚋
4. pier | Pier 39 & Fisherman's Wharf | 12:00–1:00 PM | Visit the sea lion docks, see Alcatraz across the water and grab lunch. | /recording/sf/pier-39.jpg | 37.8108,-122.4105 | 🦭
5. palace | Palace of Fine Arts | 1:15–1:45 PM | Beautiful classical-style architecture and a peaceful lagoon. Take a taxi/rideshare here to save time. | /recording/sf/palace.jpg | 37.8029,-122.4484 | 🏛️
6. crissy | Crissy Field | 2:00–3:15 PM | Walk by the bay, enjoy the Golden Gate views, and watch for Fleet Week aircraft. Practice is scheduled within the 1–5 PM window, not necessarily continuously. | /recording/sf/crissy-field.jpg | 37.8043,-122.4649 | 🌊 | citation San Francisco Chronicle +1 at https://www.sfchronicle.com/ with /recording/sf/sfchronicle.png
7. bridge | Golden Gate Bridge | 3:30–4:15 PM | Visit the south-side viewpoint and walk partway across the bridge. Use transport uphill from Crissy Field if needed. | /recording/sf/golden-gate.jpg | 37.8077,-122.4750 | 🌉
8. painted | Painted Ladies | 5:00–5:30 PM | The famous row of colorful Victorian houses, best viewed from Alamo Square Park. | /recording/sf/painted-ladies.jpg | 37.7762,-122.4328 | 🏠
9. twin | Twin Peaks | 6:00–6:45 PM | Finish at the panoramic viewpoint for sunset, approximately 6:41 PM today. | /recording/sf/twin-peaks.jpg | 37.7544,-122.4477 | 🌇 | citation Time and Date at https://www.timeanddate.com/sun/usa/san-francisco?month=10&year=2026 with /recording/sf/timeanddate.png

For every TravelStop, include imageFocalX as the thirteenth argument (after citations, which is [] when empty). Values by id: ferry=0, chinatown=100, lombard=0, pier=0, palace=48.8, crissy=0, bridge=100, painted=0, twin=48.4. These exact crop positions are measured from the shared reference.

Itinerary heading: Your itinerary
Next section heading: Getting around
Transport: Use walking and the cable car in the morning, then taxis/Uber/Lyft for longer afternoon transfers. The [Powell–Hyde cable car](https://www.sfmta.com/routes/powell-hyde-cable-car) runs daily, and SFMTA lists the single-ride fare at $9.
Transport citation: SFMTA +1 | https://www.sfmta.com/routes/powell-hyde-cable-car | /recording/sf/sfmta.png
Pace: This is a fairly full day. If traffic or delays eat into the schedule, skip the Painted Ladies rather than rushing the bridge and sunset.
Extra: **One unusual opportunity today:** Fleet Week also has free Navy ship tours at Piers 27 and 35 from 10 AM to 4 PM. If that interests you more than a conventional landmark, it's worth swapping one stop for it.
Extra citation: San Francisco Fleet Week | https://fleetweeksf.org/ | /recording/sf/fleetweek.png
Question: Where in San Francisco are you starting from—your hotel or which neighborhood? I can adjust the route so you don't waste time getting to the first stop.
`;

export const sfFollowupContext = `For a subsequent follow-up turn, update the existing itinerary in response to the selected request. Do not repeat the initial title, gallery, Fleet Week note, closing question or follow-up options. Return a real updated response using the same reusable Travel components and reference photographs.
For "Move Golden Gate Bridge to sunset", begin with two TravelProse paragraphs:
Done — we'll make **Golden Gate Bridge** the grand finale, with sunset at approximately **6:41 PM today (October 8)**.
I've moved **Twin Peaks** and the **Painted Ladies** earlier in the day, so you finish along the Golden Gate waterfront.
Then show the updated TravelMap and TravelItinerary. Use this order: Ferry Building, Chinatown, Lombard Street, Pier 39, Palace of Fine Arts, Twin Peaks, Painted Ladies, Crissy Field, Golden Gate Bridge. Schedule the bridge for 6:00–6:45 PM, Crissy Field for 5:00–5:45 PM, and move the two inland stops earlier. Keep the same images and locations. Emit the map before its stop definitions so pins populate during the live stream.
For another allowed follow-up, make that requested change to the same route, with a short explanation and updated map/itinerary. The historical date remains October 8, 2026.`;
