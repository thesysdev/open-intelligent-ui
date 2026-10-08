# Response agent implementation notes

## Scope and provenance

This branch starts from `49f1f6a` and selectively brings forward the parts needed for a general sightseeing agent. It does not include the sixteen-example gallery or unrelated specialized simulations.

| Source | Retained or adapted |
| --- | --- |
| `97409fe` — Add interactive Intelligent UI examples and restyle component library | The base component visual tokens and restyles in `src/app/globals.css`, light page layout, and travel map/card styling. |
| `52dd8b5` — Make intelligent UI examples composable with shared state and generated scenes | Per-response `RouteStoreProvider`, stable stop keys and scoped map/card anchors, deduplicated suggestions, and shared route interaction state. |
| [thesysdev/openui#1327](https://github.com/thesysdev/openui/pull/1327), head `c265b2ab58e4aa9ba36c73b536d933d33cb4e115` | OpenUI brand assets, 68px collapsed rail, shared reading column, pill composer, and floating shell geometry. Its primary shell commit is `504c8bdce51be26965b7fbbd18c56d0cf8f99665`; the second commit removes an unrelated thread cache. |
| [The supplied ChatGPT conversation](https://chatgpt.com/share/6ac7789b-1854-83e8-b6eb-7678790d179e) and recorded video | The reference response layout, historical San Francisco itinerary, and explicit image choices used only by the recording preset. |

The shell uses the published `@openuidev/react-ui@0.16.3` slots and hooks. It does not depend on PR #1327's unpublished `ChatHeader` or `card` starter API. `src/components/agent-shell.css` documents the adaptation.

Main’s Gateway integration (`655d344`, PR #2) is retained for normal chat, including image search and the ability to build customization forms from existing primitives. This branch’s composable travel map supersedes the older specialized route map.

## Normal generative mode

Open `/` and submit a request. `AgentInterface` posts the conversation through `fetchLLM` to `/api/chat`. The server generates a cloud prompt from `src/generated/spec.json`, adds travel guidance from `src/lib/prompt-options.ts`, and makes a live Gateway Responses request with image search. The Responses adapter passes partial output into the OpenUI renderer. The optional film preset retains its separate live Chat Completions transport.

The registered travel components are small enough to combine in different responses:

| Component | Purpose |
| --- | --- |
| `TravelHeading` | Response and section headings. |
| `TravelProse` | Paragraphs with limited inline emphasis and optional citations. |
| `TravelCitation` | Compact links to supplied supporting sources. |
| `TravelImage`, `TravelGallery` | Destination photos, optional horizontal crop focus, and local save toggles. |
| `TravelStop` | A destination record: stable ID, name, time, description, image, coordinates, category, and optional link/citations/image crop focus. |
| `TravelMap` | Interactive map, destination selection, category filtering, and expansion. |
| `TravelItinerary` | Divided image-and-text rows for the same destination records. |

Use the **same `TravelStop` references** in `TravelMap` and `TravelItinerary`. Their `Card` owns a `RouteStoreProvider`, so selection and route edits stay within that response. Stable IDs distinguish repeated visits to places with the same name. The travel group exposes the new composable components alongside all restyled base primitives; the older specialised route components are not offered to the model.

For another city, the model supplies new places, coordinates, descriptions, and image references. A Wikipedia title can provide a fallback stop photograph when no known image URL is supplied. The Gateway performs image search; this branch does not enable general web research, so event schedules, fares, opening hours, and similar facts need supplied evidence before being presented as verified current information.

## Explicit recording preset

The server requires both:

1. `ENABLE_RECORDING_PRESET=1` in its environment.
2. A request to `/api/chat?capture=sf` ending with this exact user prompt:

```text
I'm in San Francisco for a day, plan a sightseeing route for me
```

The page `/?capture=sf` forwards that query to the API. Without the server flag, the API returns `403`. With the flag, a different prompt returns `400`; use normal chat for another request.

`src/lib/recording-context.ts` provides the historical itinerary, response order, stop data, citations, and local image paths as additional model context. The local photographs match the reference choices, and their original source URLs are listed in `public/recording/sf/sources.json`. The reference's “today” refers to **October 8, 2026**.

Every answer token still comes from the configured upstream model. There is no canned response endpoint, prerecorded token replay, artificial delay, or buffering of the complete answer before display. Because generation remains live, changing the model or prompt can change the output; inspect a take before recording it.

This preset conditions the right-hand run on known reference content. It demonstrates the interface and a particular observed live run; it is **not a controlled benchmark of equal model workloads**. Do not turn the observed duration into a general speed claim.

## Run and capture

Create `.env.local` with `THESYS_API_KEY` and optional `THESYS_MODEL` for normal Gateway chat. The recording provider can be configured separately with `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL`; its API key falls back to `THESYS_API_KEY`. Set optional `REASONING_EFFORT` only when the provider/model supports it.

```bash
pnpm install
pnpm dev
```

For the film take, set `ENABLE_RECORDING_PRESET=1`, restart the server, open `http://localhost:3000/?capture=sf`, and use a **969×1080 CSS viewport**. The centered response column is 691px wide. Submit the exact prompt, record the real stream, and then exercise the map and itinerary. The top-level video composition supplies the two brand labels; the capture route therefore hides app navigation, submitted prompt bubbles, and the inline generation label, while keeping the live composer. The welcome screen has no subtitle.

For a production-mode local run:

```bash
pnpm build
pnpm start
```

A different local port can be supplied with `pnpm dev --port 3002` or `pnpm start --port 3002`. Keep the server flag disabled for normal deployments unless the recording preset is intentionally required.

The earlier phone-sized recorder was removed on main. Use the capture route and its walkthrough control for the comparison film.

## Timing semantics

The shell exposes measurements on `[data-agent-shell]`:

| Attribute | Meaning |
| --- | --- |
| `data-stream-state` | `idle`, `requesting`, `streaming`, `complete`, `error`, or `cancelled`. |
| `data-stream-started-ms` | `performance.now()` when the request begins. |
| `data-stream-first-chunk-ms` | `performance.now()` when the first response bytes arrive. |
| `data-stream-done-ms` | `performance.now()` when the stream finishes, errors, or is cancelled. |
| `data-stream-elapsed-ms` | Request-to-stream-completion duration for a completed run. |

The normal “Rendered in N.N s” label is set after the live stream completes, the map camera/route reveal finishes, and response photo elements have settled. `data-render-done-ms` and `data-render-elapsed-ms` expose this separate measurement. The network-only duration remains in `data-stream-elapsed-ms`. These are measurements of an individual run, not general provider performance; asynchronous basemap tiles can still depend on external services. All timestamps are relative to the page's performance clock, not wall-clock dates.

## Verification

```bash
pnpm generate
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

The tests make no provider requests. They check:

- Separate responses cannot change one another's selection, removals, or suggestions.
- Repeated place names stay distinct through stable IDs and scoped anchors.
- Added suggestions are copied, deduplicated, and publish correct state changes.
- Malformed JSON, invalid roles, invalid message shapes, and oversized conversations are rejected.
- A browser query cannot bypass the server flag, and the preset rejects another prompt.
- URLs cannot introduce executable schemes; partial model content remains renderable and plain text stays escaped.

Manually check normal requests for at least two cities, both narrow and desktop layouts, map expansion/filtering/selection, a second independent response, new chat/history, keyboard focus, cancellation, provider errors, and the capture view's actual timing state. Build/type checks alone do not verify visual fidelity.

## Basemap and street geometry

The interactive map uses Leaflet, a MapLibre vector layer, and a restrained local palette over [OpenFreeMap](https://openfreemap.org/quick_start/) / OpenStreetMap geometry. It keeps source attribution visible. If WebGL or vector loading is unavailable, an Esri raster layer provides a fallback. OSRM supplies street geometry in the background; a labelled direct overview remains available if routing fails. This road geometry is not mixed-mode navigation.

## Streaming and film walkthrough

Text reveals new word spans with a short opacity/blur transition; existing words keep their nodes. Reduced-motion preferences disable those transitions. Photos accept an optional horizontal focal point (`TravelImage.focalX` / `TravelStop.imageFocalX`); the recording context supplies the crop positions inspected in the reference chat.

The map keeps one Leaflet instance and reconciles markers by stable stop ID. During streaming it waits until both coordinate tokens are complete, adds each available marker to a steady city overview, and retains existing marker DOM. Once streaming finishes it frames the route once and draws the line. Selection, category filtering, and resizing do not recreate all markers or repeatedly reset the camera.

The recording view exposes **Walk through response**. This film-only control moves the real scroll container using a cadence measured from the supplied left recording and displays a cursor. It does not replay model output, manufacture tokens, or affect normal chat. The control sits in the header area covered by the film's brand overlay. The revised movie accelerates each recording independently to align visual stages, labels the playback rates, and keeps counters on original elapsed times. It must not be described as a simultaneous real-time benchmark.
