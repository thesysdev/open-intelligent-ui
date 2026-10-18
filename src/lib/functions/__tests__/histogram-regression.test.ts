import { describe, expect, it } from "vitest";
import { Histogram } from "../data";
import { run } from "./run";

describe("@Histogram labels at very small scales", () => {
  it("counts finite small values without exceeding toFixed's digit limit", () => {
    const result = Histogram.fn({ values: [0, 1e-120], bins: 2, min: 0, max: 1e-120 });
    expect(result.map((bin) => bin.value)).toEqual([1, 1]);
    expect(result.map((bin) => bin.start)).toEqual([0, 5e-121]);
    expect(new Set(result.map((bin) => bin.key)).size).toBe(2);
    const parsed = run('@Histogram($values, 2, $lo, $hi)', '$values = []\n$lo = 0\n$hi = 1', {
      $values: [0, 1e-120], $lo: 0, $hi: 1e-120,
    });
    expect(parsed.value).toEqual(result);
    expect(parsed.runtimeErrors).toEqual([]);
  });

  it("retains distinct negative scientific-notation labels", () => {
    const result = Histogram.fn({ values: [-1e-120, -5e-121, 0], bins: 2, min: -1e-120, max: 0 });
    expect(result.map((bin) => bin.value)).toEqual([1, 2]);
    expect(result.map((bin) => Number(bin.key))).toEqual(result.map((bin) => bin.start));
  });

  it("preserves readable ordinary scale labels", () => {
    expect(Histogram.fn({ values: [0.1, 0.6], bins: 4, min: 0, max: 1 }).map((bin) => bin.key))
      .toEqual(["0", "0.25", "0.5", "0.75"]);
  });
});
