import { createLibrary, createParser, defineComponent, evaluateElementProps, type OpenUIError } from "@openuidev/lang-core";
import { z } from "zod/v4";
import { describe, expect, it } from "vitest";
import { learnFunctions } from "./functions";

// A one-prop component so @Trend(...) is parsed and evaluated by the real 1.0
// parser and evaluator with the learn library's functions, as the page does.
const Out = defineComponent({ name: "Out", props: z.object({ value: z.any() }), description: "Test output", component: null });
const library = createLibrary({ root: "Out", components: [Out], functions: learnFunctions, actions: [] });
const schema = library.toJSONSchema();
const parser = createParser(schema, "Out");
const fns = Object.fromEntries(
  Object.entries(schema.functions ?? {}).map(([name, s]) => [name, { ...s, fn: library.functions[name]!.fn }]),
);

function value(expr: string) {
  const parsed = parser.parse(`root = Out(${expr})`);
  const errors: OpenUIError[] = [];
  const ctx = { getState: () => undefined, resolveRef: () => undefined, functions: fns, actions: schema.actions };
  const el = evaluateElementProps(parsed.root!, { ctx, library, store: null, errors });
  return (el.props as { value: unknown }).value;
}

describe("@Trend", () => {
  it.each([
    ["@Trend([100, 120, 115])", 15],
    ["@Trend([5, 5])", 0],
    ["@Trend([1, 2, 3, 4])", 3],
    ["@Trend([10, 5])", -5],
    ["@Trend([7])", 0],
    ["@Trend([])", 0],
  ])("%s", (expr, expected) => expect(value(expr)).toEqual(expected));
});
