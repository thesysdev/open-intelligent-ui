# Open Intelligent UI

An open-source reconstruction of the interactive experiences shown in OpenAI’s public Intelligent UI launch. Built with React, Next.js and [OpenUI](https://openui.com), with a working model-driven chat and a deterministic example gallery.

## Run locally

Requires Node 24 and pnpm.

```bash
cp .env.example .env.local
# Add your Thesys API key to .env.local.
pnpm install --frozen-lockfile
pnpm dev --hostname 127.0.0.1 --port 3001
```

Open [the examples](http://127.0.0.1:3001/?view=examples), [chat](http://127.0.0.1:3001/?view=chat), or [the component library](http://127.0.0.1:3001/?view=components). The gallery works without an API key; model-generated chat needs one. Keys stay in the server-side, ignored `.env.local` file.

The example configuration uses the Thesys OpenAI-compatible endpoint. For a different compatible provider, set `OPENAI_BASE_URL`, `OPENAI_API_KEY` and `OPENAI_MODEL` together. `REASONING_EFFORT` is optional and should only be set for a model that supports it.

## Experiences

- Learning: bicycle systems, central limit theorem, GDP, drone market and Monty Hall.
- Making: bicycle assembly, room colors, twelve-step origami, a garden planner and a playable three-game retro console.
- Everyday tools: a ten-day Pacific Northwest road trip, city route planning, Sunday roast with scalable shopping quantities, capsule wardrobe, itemized bill splitting and compound savings.
- Original library: all 84 existing OpenUI component types, organized into seven preview families, with shared ChatGPT-inspired typography, surfaces, spacing and controls.

Examples can be linked directly with `?view=examples&example=room` (or `bicycle`, `bike-repair`, `route`, `roadtrip`, `origami`, `garden`, `recipe`, `wardrobe`, `clt`, `gdp`, `drones`, `monty`, `bill`, `savings`, `game`).

## Development

Component implementations live in `src/lib/intelligent/`; map and itinerary components live in `src/lib/route/`. The model registry is `src/lib/library.tsx`, and guidance/examples live in `src/lib/prompt-options.ts`.

After changing a registered schema:

```bash
pnpm generate
pnpm exec tsc --noEmit
pnpm build
```

Each component definition must receive its own Zod schema instance. Reusing a schema object across definitions overwrites its component metadata; clone shared schemas before registering them.

The visual foundation is in `src/app/globals.css`; the shell and individual interactive experiences have scoped styles beside their components. Illustrations are original SVG artwork. Maps and venue photos load from OpenStreetMap and Wikipedia/Wikimedia. Example budgets, revenue figures and investment returns are illustrative, not live quotes or forecasts.

## Public design references

- [Official launch article and examples](https://openai.com/index/gpt-6-for-everyone/)
- [Official launch video, including the examples after 38 seconds](https://x.com/OpenAI/status/2107894997538525580?s=20)
- [OpenAI plugin UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines)
- [OpenAI Apps SDK UI](https://openai.github.io/apps-sdk-ui/)

This project reconstructs publicly visible design and behavior. It does not include OpenAI’s private implementation.
