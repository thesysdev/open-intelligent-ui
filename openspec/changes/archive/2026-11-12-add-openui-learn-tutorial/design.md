# Design

## Context

The app is a Next 16 + OpenUI (`@openuidev/react-lang`, `@openuidev/react-ui`) app. A single component — `Renderer` from `@openuidev/react-lang` — already renders arbitrary OpenUI Lang against a library, exactly as `/gallery` and `/preview` do. The `/clash` and `/chess` coaches demonstrate the "custom library = `baseComponents` + additions" pattern this tutorial teaches. Motivation is in proposal.md.

## Goals / Non-Goals

**Goals:**
- Reuse `Renderer` for the playground so the tutorial renders exactly what the app renders.
- Keep lessons data-driven and committed in the repo, separate from the `/learn` shell.
- Ship a runnable, self-contained example library that stays out of the base `library.ts` contract.

**Non-Goals:**
- Not changing the base component library, its names, argument order, or option values.
- No in-browser TypeScript execution: code-authoring and wiring lessons are read + follow-along; only Lang editing and description editing are interactive.
- No auth, no CMS, no external content pipeline — lessons are committed source.

## Decisions

1. **`/learn` is a Next route with a client shell, data-driven lessons.**
   - A typed lesson array (`{ id, part, title, prose, blocks }`) under `src/app/learn/` drives the shell (navigation, progress, per-lesson prose + playground).
   - *Alternative*: a separate static site — rejected, it would not share `Renderer` or the library and would drift.

2. **Playground is a textarea + `<Renderer>`; errors reuse `onError`.**
   - `Renderer` is the app's exact renderer, and its `onError` callback already yields parse/evaluation errors, so the playground is a controlled textarea plus that callback.
   - *Alternative*: a Monaco/CodeMirror editor — rejected for the first cut (heavier dependency; a plain textarea is enough and can be swapped later).

3. **A lesson can be one of three shapes, distinguished by its `blocks`.**
   - `prose` (markdown), `lang` (a snippet rendered live and editable in the playground), and `code` (TypeScript shown read-only, optionally with its generated spec alongside).
   - *Rationale*: the five layers need different treatments — the Lang layer is live, authoring is read-with-spec, wiring is follow-along.

4. **Running example lives in `src/lib/learn/` as a reference library.**
   - Two components (`KpiCard`, `StatusBadge`), one `@function` (`@Trend`), one data tool (`get_metrics`), assembled via `createLibrary` over `baseComponents`, mirroring `/clash`.
   - The lessons instruct the learner to build the same thing in the repo; the committed reference is the renderable answer and the `/clash` coach is the full-scale reference.
   - *Alternative*: a separate template repo or git branch — deferred; extraction is a later, non-breaking step.

5. **The five layers map to lesson parts (Part 0–5).** The playground is live in the Lang lessons; Part 3's "write a good description" lesson shows editable `description` text beside the pre-generated spec entry and explains that the real regeneration is `npm run generate` (a CLI step, not browser-live).

6. **Lesson Lang programs are validated like gallery programs.** Each `lang` block is added to the parser test suite so content rot fails the build.

## Risks / Trade-offs

- [Renderer API drift] → reuse the exact call shape from `/gallery`/`/preview` rather than a new abstraction, and read the installed `next`/OpenUI docs before coding.
- [Lesson content rot against the library] → every `lang` block is covered by the parser test suite; a broken snippet fails `npm test`.
- [Running example drifts from the base library] → it extends `baseComponents` (like `/clash`), so it inherits changes; regenerating its spec/prompt uses the same `npm run generate` step.
- [Scope: five layers is a lot of content] → tasks break the tutorial into parts so it can ship incrementally, with the Lang and component-authoring lessons first.

## Open Questions

- Exact wording and depth of each lesson's prose (content work; does not change the approach or specs).
- Whether to upgrade the playground to Monaco/CodeMirror later (depends on feedback).
- Whether to extract the running example into a standalone template repo later (deferred, non-breaking).
