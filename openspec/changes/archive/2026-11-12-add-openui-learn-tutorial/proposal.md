# Proposal

## Why

OpenUI's developer story is currently reference-only: the README documents "how it works" and `/gallery` shows examples, but there is no guided path that takes a developer from zero to a working custom component library. The single most important and non-obvious concept — that a component is, to the model, just a `name` plus a zod `props` schema plus a prose `description` — is buried in code. Developers (and teams adopting OpenUI) hit a wall exactly where it matters most: "how do I make OpenUI use *my company's* components?" This change adds an interactive, self-paced tutorial that closes that gap.

## What Changes

- Add a `/learn` route: an interactive developer tutorial, built with OpenUI itself, reusing the existing `<Renderer>`.
- Cover the full integration surface across five layers: the OpenUI Lang language; the four authoring primitives (`defineComponent`, `defineFunction`, `defineAction`, `ToolSpec`); teaching the model (library, `componentGroups` notes, prompt rules + examples); generation and runtime wiring; and the contract/verification discipline.
- Add an interactive playground: edit OpenUI Lang and see it render live, with parse/evaluation errors surfaced (via `Renderer`'s `onError`).
- Add a running example — a mini "company design system" (two components, one `@function`, one data tool) that the learner builds across the lessons, with `/clash` as the full-scale reference.
- **No changes** to the existing component library, its component/function/action names, argument order, or option values — the "do not touch" contract stays intact.

## Capabilities

### New Capabilities

- `openui-tutorial`: an interactive, self-paced developer tutorial that teaches OpenUI usage and custom component-library integration, including a live Lang playground and a running component-library example.

### Modified Capabilities

<!-- No existing specs to modify. -->

## Impact

- **New code**: `src/app/learn/` route with lesson content/data and navigation; a live playground component; `src/lib/learn/` running-example component library (reference implementation the learner recreates).
- **Reuses**: `@openuidev/react-lang` `Renderer` (as in `src/app/gallery/` and `src/app/preview/`), `src/lib/library.ts`, `src/lib/coach/*` as the full-scale reference, and `src/generated/*` shown inside lessons.
- **No API surface changes**: no new or modified `/api/*` routes are required to serve the tutorial itself.
- **Docs**: README gains a "For developers" pointer to `/learn`.
- **Tests**: lesson programs must parse under the OpenUI 1.0 parser (as gallery programs do today); playground error display is covered.
