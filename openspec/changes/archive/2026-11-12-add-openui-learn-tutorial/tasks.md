# Tasks

## 1. Running example library (`src/lib/learn/`)

- [x] 1.1 Create `src/lib/learn/components.tsx` with `KpiCard` and `StatusBadge`, each `defineComponent` with zod `props` and a prose `description`, and verify `npm run typecheck` passes and both render in the gallery-style harness
- [x] 1.2 Add `@Trend` via `defineFunction` in `src/lib/learn/functions.ts` and a parser/evaluator unit test in the `src/lib/functions/__tests__/` style, and verify `npm test` passes
- [x] 1.3 Add the `get_metrics` data tool (`ToolSpec` + function-map provider) in `src/lib/learn/tools.ts` with a small test, and verify `npm test` passes
- [x] 1.4 Assemble `learnLibrary` via `createLibrary` over `baseComponents` (plus a `componentGroups` entry with notes) in `src/lib/learn/library.ts`, and verify `npm run typecheck` passes
- [x] 1.5 Add generation of the learn library's spec following the existing coach/chess generate pattern so lessons can show the model-facing spec, and verify the generated file exists under `src/generated/`

## 2. `/learn` shell and playground

- [x] 2.1 Add the `/learn` route (`src/app/learn/page.tsx` + layout) with light/dark theme wiring like `/gallery`, and verify it renders at `/learn`
- [x] 2.2 Define the typed lesson model and initial lesson list (`src/app/learn/lessons.ts`) with `prose`/`lang`/`code` block shapes, and verify `npm run typecheck` passes
- [x] 2.3 Build the playground component (textarea + `<Renderer response onError>`), and verify editing a `lang` block re-renders and an invalid program shows its error
- [x] 2.4 Add lesson navigation and progress (fixed order, current/complete marking, localStorage persistence), and verify advancing marks progress and a reload restores it

## 3. Lesson content (five layers)

- [x] 3.1 Write Part 0 (mental model) and Part 1 (Lang: composition, state, compute, actions, working tool) as `lang` blocks, and verify each block parses under the parser test added in this group
- [x] 3.2 Write Part 2 (authoring: `defineComponent`, `defineFunction`, `defineAction`, `ToolSpec`) with `code` blocks and the matching generated-spec excerpts from `src/generated/*`, and verify every referenced snippet exists and matches its source
- [x] 3.3 Write Part 3 (model instruction: `createLibrary`/`componentGroups` notes, `PromptOptions` rules + examples) including the description-to-spec exercise, and verify the prose and code blocks render
- [x] 3.4 Write Part 4 (generate and wire) and Part 5 (contract and verify) as follow-along steps, and verify the documented commands run as written
- [x] 3.5 Add a parser test that runs every lesson `lang` block (in the `programs.test.ts` style), and verify `npm test` passes with all lesson programs

## 4. Integration checks

- [x] 4.1 Add a README "For developers" section pointing to `/learn`, and verify the link and description are accurate
- [x] 4.3 Add Chinese/English switching to the tutorial: a `Localized` lesson model, a language toggle persisted to localStorage (with a `?lang=` query param), and Chinese translations of all lesson titles and prose; and verify `npm run typecheck` and `npm test` pass
- [x] 4.2 Run `npm run build`, then open `/learn` in light and dark at phone width, and verify the tutorial renders and the existing chat still works with no regressions
