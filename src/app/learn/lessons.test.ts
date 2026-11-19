import { createParser, type LibrarySpec } from "@openuidev/lang-core";
import { describe, expect, it } from "vitest";
import spec from "@/generated/learn-spec.json";
import { lessons } from "./lessons";

// Every lesson `lang` block must parse with the learn library's spec, so a
// change to a component schema fails the build instead of shipping broken prose.
const library: LibrarySpec = spec;
const parser = createParser(library.schema!, library.root);

const langBlocks = lessons.flatMap((lesson) =>
  lesson.blocks
    .filter((b) => b.kind === "lang")
    .map((b) => ({ lesson: lesson.id, code: (b as { code: string }).code })),
);

describe.each(langBlocks)("$lesson", ({ code }) => {
  it("parses with the 1.0 parser without errors", () => {
    const result = parser.parse(code);
    expect(result.root).not.toBeNull();
    expect(result.meta.errors.map((e) => e.message)).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
    expect(result.meta.orphaned).toEqual([]);
  });
});
