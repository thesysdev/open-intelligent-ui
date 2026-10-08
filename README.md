# intelligent-ui

An [OpenUI](https://openui.com) demo that recreates the "plan a sightseeing route in San Francisco" experience. The model streams OpenUI Lang through the existing OpenUI Gateway and renders an OpenAI-inspired response using reusable components.

- `TravelHeading` and `TravelProse`: editorial headings and paragraphs with streaming word fades.
- `TravelImage` and `TravelGallery`: a stable three-photo strip using Gateway image-search results, with optional crop focus and Wikipedia fallbacks.
- `TravelStop` and `TravelItinerary`: reusable destination data and compact photo/text rows. Share the same stop references with `TravelMap`.
- `TravelMap`: a real street map with emoji pins, category filters, expansion, and map-to-itinerary selection. Pins arrive without resetting the camera; once streaming ends, the map frames the route and draws its line.
- The existing OpenUI form components still provide the route-customization flow and send the selected preferences back with `@ToAssistant`.

Generated responses use `src/lib/response-theme.ts` and `src/lib/response-theme.css` for typography, spacing, monochrome controls, soft borders, and consistent sliders. The theme is scoped to each response and its portalled menus; it does not change the sidebar, chat header, welcome screen, or composer. The older `RouteMap`, `RouteStop`, `RouteStops`, and `RouteSuggestions` names remain registered for compatibility, with per-response interaction state.

The components live in `src/lib/travel/` and `src/lib/route/`. They're registered in `src/lib/library.ts`, and the prompt example is in `src/lib/prompt-options.ts`. New sightseeing requests use the updated layout automatically, including when users ask for another city or customize a route.

## Setup

Requires Node 24 and pnpm.

```bash
cp .env.example .env.local   # add your THESYS_API_KEY
pnpm install
pnpm dev
```

Open http://localhost:3000 and try: `I'm in San Francisco for a day, plan a sightseeing route for me`

Chat runs through [OpenUI Gateway](https://www.openui.com/docs/gateway) (`https://api.thesys.dev/v1/embed`) over the Responses API, with `generateSystemPrompt({ cloud: true })` so Gateway validates and corrects the generated OpenUI Lang against this library. Gateway's hosted `image_search` tool finds current photos for each stop; the model copies returned URLs into `TravelImage.src` and `TravelStop.imageUrl`. Photos fall back to Wikipedia when no URL is available or a searched image fails to load. `THESYS_MODEL` is optional and takes a `{provider}/{model}` id (default `openai/gpt-5.5`).

`REASONING_EFFORT` is optional. `low` makes the first UI appear much sooner on reasoning models.

## Verify the response visuals

```bash
pnpm generate
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Try the San Francisco prompt above, then another destination such as Lisbon. Check the photo strip, map pins appearing during the stream, the final route reveal, map filters/expansion, and the customization form on desktop and mobile. The form uses 24px between question groups and 40px before its primary action.

Maps use OpenFreeMap / OpenStreetMap geometry with visible attribution and an Esri raster fallback. OSRM provides a street-route overview; when unavailable, a labelled direct connection remains. This is not turn-by-turn walking or mixed-mode navigation. Content and photos are generated live; this branch does not contain the film's fixed San Francisco recording preset.
