import { defineFunction } from "@openuidev/react-lang";
import { z } from "zod/v4";

// One custom @function for the /learn example: the model calls it as
// @Trend([...]) to compute inside a page. It is pure and returns a number.

export const Trend = defineFunction({
  name: "Trend",
  description: "The change across a series: the last value minus the first, e.g. @Trend([100, 120, 115]) is 15. Returns 0 for fewer than two values.",
  params: z.object({ values: z.array(z.number()) }),
  returns: z.number(),
  fn: ({ values }) => {
    if (!Array.isArray(values) || values.length < 2) return 0;
    const first = values[0]!;
    const last = values[values.length - 1]!;
    if (typeof first !== "number" || typeof last !== "number" || !Number.isFinite(first) || !Number.isFinite(last)) throw new Error("values must be numbers");
    return last - first;
  },
});

export const learnFunctions = [Trend];
