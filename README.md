# intelligent-ui

An [OpenUI](https://openui.com) demo that recreates the "plan a sightseeing route in San Francisco" experience. The model streams OpenUI Lang, and the app renders it with its own travel components:

- `RouteMap`: a [MapLibre GL](https://maplibre.org) vector map (free [OpenFreeMap](https://openfreemap.org) tiles, no key) with numbered pins and a walking path. It expands, and tapping a pin jumps to that stop's card.
- `RouteStops` / `RouteStop`: photo cards with a story and a "Before you go" section, plus remove/add-back. Photos come from Gateway image search, with Wikipedia/Wikimedia as the fallback; coordinates can also come from Wikipedia.
- `RouteSuggestions`: suggested extra stops with "+ Add to my route". Adding one puts a new pin on the map, extends the path, updates the stop count and appends a card marked "Added".
- A "Customize your route" form, built from OpenUI's own form components. Its button uses `@ToAssistant`, which sends the user's choices back to the model as the next turn, and the model answers with a rebuilt route.

The components live in `src/lib/route/`. They're registered in `src/lib/library.ts`, and the prompt example is in `src/lib/prompt-options.ts`.

## Setup

Requires Node 24 and pnpm.

```bash
cp .env.example .env.local   # add your THESYS_API_KEY
pnpm install
pnpm dev
```

Open http://localhost:3000 and try: `I'm in San Francisco for a day, plan a sightseeing route for me`

Chat runs through [OpenUI Gateway](https://www.openui.com/docs/gateway) (`https://api.thesys.dev/v1/embed`) over the Responses API, with `generateSystemPrompt({ cloud: true })` so Gateway validates and corrects the generated OpenUI Lang against this library. Gateway's hosted `image_search` tool finds current photos for each stop; the model copies the returned URLs into `RouteStop`'s `photos`, and cards fall back to Wikipedia when a stop has none or an image fails to load. `THESYS_MODEL` is optional and takes a `{provider}/{model}` id (default `openai/gpt-5.5`).

`REASONING_EFFORT` is optional. `low` makes the first UI appear much sooner on reasoning models.
