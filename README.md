# OpenUI sightseeing agent

A real streaming [OpenUI](https://openui.com) agent with a ChatGPT-inspired response layout: destination photographs, an interactive map, itinerary rows, source links, and transport advice. The agent can plan for different cities; the model supplies the content and composes reusable components.

This focused branch keeps the restyled base component library and response-scoped route state from the Intelligent UI work. Its shell adapts the collapsed rail, shared reading column, and pill composer from [OpenUI PR #1327](https://github.com/thesysdev/openui/pull/1327) using the published `AgentInterface` API.

## Run locally

Use Node 24 and pnpm. Create `.env.local` with your server-side provider settings:

```dotenv
OPENAI_API_KEY=your_thesys_api_key
OPENAI_BASE_URL=https://api.thesys.dev/v1/embed
OPENAI_MODEL=openai/gpt-5.2
ENABLE_RECORDING_PRESET=0
```

`REASONING_EFFORT` is optional and must be supported by the selected model. Never put the API key in a `NEXT_PUBLIC_` variable.

```bash
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000) and try:

> I'm in San Francisco for a day, plan a sightseeing route for me

Then try another city to check that the content changes. Select a map pin, open a stop from the itinerary, filter the map, expand it, and save a gallery image. The save toggle lasts for the current rendered response.

## Controlled comparison recording

For the matching San Francisco film take, explicitly set `ENABLE_RECORDING_PRESET=1` on the server, restart it, and open [localhost:3000/?capture=sf](http://localhost:3000/?capture=sf). Submit the exact prompt above. This mode supplies the reference itinerary and image choices to the **live model**; it does not return a stored answer or replay a stream. The capture query alone cannot enable it.

The capture view hides navigation and development inspection controls, keeps the real input and renderer, and uses a 691px reading column. A 969×1080 CSS viewport matches the source recording's panel proportions. The completed response shows its measured request-to-stream-completion time. A reference-conditioned film take is a controlled product demonstration, **not a model-speed benchmark**.

See [the response-agent notes](docs/response-agent.md) for components, provenance, capture details, and verification steps. Reference asset URLs are recorded in [sources.json](public/recording/sf/sources.json).

## Validate

```bash
pnpm generate
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Tests cover response isolation, stable place IDs, duplicate suggestions, malformed requests, the server recording gate, safe links, and partial streamed content. They do not call a model provider.
