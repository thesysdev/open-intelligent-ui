# openui-tutorial Specification

## Purpose

Teaches developers how to use OpenUI and integrate a custom component library, through an interactive tutorial with a live rendering playground and a worked example.

## Requirements

### Requirement: Tutorial is reachable
The app SHALL expose the tutorial at a stable, dedicated URL so a developer can open it directly without searching the codebase.

#### Scenario: Opening the tutorial
- **WHEN** a developer opens the tutorial URL
- **THEN** the tutorial loads and shows a list of lessons in sequence

### Requirement: Tutorial covers the full integration surface
The tutorial SHALL contain lessons covering the OpenUI language, authoring components and functions, instructing the model through the library and prompt, generating and wiring the runtime, and the contract and verification discipline.

#### Scenario: Locating a lesson for each area
- **WHEN** a developer browses the lesson list
- **THEN** a lesson exists for each of the areas: the language, authoring primitives, model instruction, generation and wiring, and contract and verification

### Requirement: Interactive playground
The tutorial SHALL provide a playground in which a developer edits OpenUI Lang and sees it render, and SHALL surface parse and evaluation errors.

#### Scenario: Rendering edited Lang
- **WHEN** a developer edits the Lang in the playground
- **THEN** the rendered output updates to match the edited Lang

#### Scenario: Showing an error
- **WHEN** the edited Lang is invalid
- **THEN** the playground shows the parse or evaluation error

### Requirement: Worked component-library example
The tutorial SHALL include a worked example that walks a developer through building a small custom component library with at least one component, one function, and one data tool, and rendering it.

#### Scenario: Completing the example
- **WHEN** a developer follows the worked example lessons
- **THEN** they have a small custom component library they can render in the playground

### Requirement: Lesson progression
The tutorial SHALL present lessons in a fixed order and mark a developer's progress as they advance.

#### Scenario: Advancing to the next lesson
- **WHEN** a developer finishes a lesson
- **THEN** the lesson is marked complete and the next lesson becomes available

### Requirement: Bilingual content
The tutorial SHALL present its lesson titles, prose and shell labels in English and Chinese, switchable by the developer, while keeping code and OpenUI Lang blocks untranslated.

#### Scenario: Switching language
- **WHEN** a developer switches the language control
- **THEN** the lesson titles, prose and navigation labels render in the chosen language while the code and Lang blocks stay unchanged

#### Scenario: Remembering the choice
- **WHEN** a developer returns to the tutorial
- **THEN** their previously chosen language is restored

### Requirement: Existing chat behavior is unchanged
The tutorial SHALL render pages with the same component library as the chat, and SHALL NOT change the names, argument order, or option values the chat model relies on.

#### Scenario: Chat continues to work
- **WHEN** the tutorial is added
- **THEN** the existing chat continues to render answers using the unchanged component library
