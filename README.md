# intelligent-ui

An [OpenUI](https://openui.com) demo that recreates the "plan a sightseeing route in San Francisco" experience. The model streams OpenUI Lang, and the app renders it with its own travel components:

- `RouteMap`: a Leaflet map with numbered pins and a walking path. It expands, and tapping a pin jumps to that stop's card.
- `RouteStops` / `RouteStop`: photo cards with a story and a "Before you go" section, plus remove/add-back. Photos and coordinates come from the Wikipedia/Wikimedia APIs.
- `RouteSuggestions`: suggested extra stops with "+ Add to my route". Adding one puts a new pin on the map, extends the path, updates the stop count and appends a card marked "Added".

The components live in `src/lib/route/`. They're registered in `src/lib/library.ts`, and the prompt example is in `src/lib/prompt-options.ts`.

## Setup

Requires Node 24 and pnpm.

```bash
cp .env.example .env.local   # add your THESYS_API_KEY
pnpm install
pnpm dev
```

Open http://localhost:3000 and try: `I'm in San Francisco for a day, plan a sightseeing route for me`

Chat runs through [OpenUI Gateway](https://www.openui.com/docs/gateway) (`https://api.thesys.dev/v1/embed`) over Chat Completions, with `generateSystemPrompt({ cloud: true })` so Gateway validates and corrects the generated OpenUI Lang against this library. `THESYS_MODEL` is optional and takes a `{provider}/{model}` id (default `openai/gpt-5.5`).

`REASONING_EFFORT` is optional. `low` makes the first UI appear much sooner on reasoning models. Function tools are turned off in `src/app/api/chat/route.ts`, because Chat Completions rejects them when reasoning effort is set on gpt-6-sol.

## Recording

`scripts/record.mjs` is the Playwright script used for the demo video. It connects to a Chrome instance over CDP (`localhost:29229`) and runs the prompt → map → cards → add-a-stop flow at phone size.
