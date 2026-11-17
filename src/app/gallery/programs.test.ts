import { createParser, type LibrarySpec } from "@openuidev/lang-core";
import { describe, expect, it } from "vitest";
import spec from "@/generated/spec.json";
import { library as app } from "@/lib/library";
import { exampleDashboard, exampleShoppingList, exampleSteps, exampleTrip } from "@/lib/prompt-options";
import { compositionPrograms } from "./composition-programs";
import { programs } from "./programs";
import { toolPrograms } from "./tool-programs";

const library: LibrarySpec = spec;
const parser = createParser(library.schema!, library.root);

describe("the generated library spec", () => {
  it("matches the app's library (run npm run generate after changes)", () => {
    expect(Object.keys(library.components)).toEqual(Object.keys(app.components));
    expect(Object.keys(library.functions ?? {})).toEqual(Object.keys(app.functions));
    expect(Object.keys(library.actions ?? {})).toEqual(Object.keys(app.actions ?? {}));
  });
});

const all = [
  ...toolPrograms,
  { id: "example-list", code: exampleShoppingList },
  { id: "example-trip", code: exampleTrip },
  { id: "example-steps", code: exampleSteps },
  { id: "example-dashboard", code: exampleDashboard },
  ...programs,
  ...compositionPrograms,
];

describe.each(all)("$id", ({ code }) => {
  it("parses with the 1.0 parser without errors", () => {
    const result = parser.parse(code);
    expect(result.root).not.toBeNull();
    expect(result.meta.errors.map((e) => e.message)).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
    expect(result.meta.orphaned).toEqual([]);
  });
});
