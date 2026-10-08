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

## Composable experiences

The **Compose** filter adds nine examples that use the same renderers with different content: `unicycle`, `camera`, `workshop`, `ramen`, `kyoto`, `kettle-finishes`, `paper-plane`, `studio-layout` and `stool-assembly`. These examples run actual OpenUI programs through the same parser and renderer as chat. Bicycle and GDP now use that path too.

| Building block | What the model supplies | Examples |
| --- | --- | --- |
| ExplodedDiagram | Parts, geometry, groups, explanations and expansion offsets | Bicycle → unicycle → camera |
| SceneDrawing / SceneShape | Bounded 2D vector primitives and named regions | Original diagrams and illustrations |
| RecolorableScene | Drawing, independently editable regions and palette | Living room → kettle finishes |
| IllustratedStepGuide / AssemblyGuide | Steps, drawings, optional exploded drawings and checks | Fox → paper plane; bicycle → stool |
| EditableGrid | Rows, columns, cell assignments and available options | Garden → studio |
| InteractivePanel / InteractiveGroup | Controls, outputs and responsive groups | GDP → workshop budget |
| RecipePlanner / WardrobePlanner | Ingredients, steps, dishes; garments, outfits and packing rules | Roast → ramen; arbitrary capsules |
| BillSplitter / SavingsCalculator | People, items, currency and calculation assumptions | Dinner or trip costs; savings scenarios |
| RoadTripPlanner | Stops, location, currency, budget and traveler preferences | Pacific Northwest → Kyoto |

Controls can bind to native OpenUI `$state`. Expressions update immediately, without another model call:

```text
$people = 20
$price = 750
root = Card([InteractivePanel("Workshop revenue", [result, controls])])
result = ValueDisplay("Ticket revenue", $people * $price, "₹")
controls = InteractiveGroup([RangeControl("people", "People attending", 1, 50, 1, $people), RangeControl("price", "Ticket price", 100, 2000, 50, $price, " INR")], "two")
```

For externally controlled diagrams, bind `RangeControl.value` and `ExplodedDiagram.explode` to the same variable. Bind `ChoiceControl.value` and `ExplodedDiagram.selected` to another; choice strings match part IDs or groups. Set `showControls=false` to avoid duplicate controls and `showHeading=false` inside a titled panel. The frame automatically includes the full movement of every part without zooming during slider drags. Native button actions such as `Action([@Set($people, 20)])` can reset shared state.

The original preset names remain available for compatibility. Custom content must provide its own records and drawings; changing a preset title cannot change its geometry. Scenes are bounded 2D illustrations, not a physics engine or automatic CAD decomposition. CLT, Monty Hall and arcade games retain specialized mechanics. Model-generated geometry and factual content still require judgment; the deterministic examples are visual references, not a guarantee of identical output for every prompt.

Each response owns its route edits. Component state stays local unless explicitly bound, and partial streamed records are handled without borrowing unrelated example content.

## Development

Component implementations live in `src/lib/intelligent/`; map and itinerary components live in `src/lib/route/`. The model registry is `src/lib/library.tsx`, and guidance/examples live in `src/lib/prompt-options.ts`.

After changing a registered schema:

```bash
pnpm generate
pnpm exec tsc --noEmit
pnpm test
pnpm lint
pnpm build
```

Each component definition must receive its own Zod schema instance. Reusing a schema object across definitions overwrites its component metadata; clone shared schemas before registering them.

The regression suite parses and server-renders real OpenUI programs, exercises truncated streams and null positional placeholders, and checks currency allocation, ingredient scaling, packing rules, route isolation and bounded geometry. Shared-state behavior and responsive visuals also need browser verification: OpenUI initializes reactive declarations in a client effect, so SSR alone cannot verify linked interactions.

The visual foundation is in `src/app/globals.css`; the shell and individual interactive experiences have scoped styles beside their components. Illustrations are original SVG artwork. Maps and venue photos load from OpenStreetMap and Wikipedia/Wikimedia. Example budgets, revenue figures and investment returns are illustrative, not live quotes or forecasts.

## Public design references

- [Official launch article and examples](https://openai.com/index/gpt-6-for-everyone/)
- [Official launch video, including the examples after 38 seconds](https://x.com/OpenAI/status/2107894997538525580?s=20)
- [OpenAI plugin UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines)
- [OpenAI Apps SDK UI](https://openai.github.io/apps-sdk-ui/)

This project reconstructs publicly visible design and behavior. It does not include OpenAI’s private implementation.
