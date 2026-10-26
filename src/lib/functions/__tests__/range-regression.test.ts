import { describe, expect, it } from "vitest";
import { Range } from "../lists";
import { value } from "./run";

describe("@Range exclusive fractional endpoint", () => {
  it("does not include the end when floating point division rounds the count up", () => {
    expect(value("@Range(0.1, 0.4, 0.1)")).toEqual([0.1, 0.2, 0.3]);
    expect(value("@Range(0.4, 0.1, -0.1)")).toEqual([0.4, 0.3, 0.2]);
  });

  it("retains the final item of a partial step and handles equal bounds", () => {
    expect(value("@Range(0.1, 0.35, 0.1)")).toEqual([0.1, 0.2, 0.3]);
    expect(value("@Range(0.4, 0.15, -0.1)")).toEqual([0.4, 0.3, 0.2]);
    expect(value("@Range(0.1, 0.1, 0.1)")).toEqual([]);
  });

  it("excludes every endpoint crossed by rounding, in either direction", () => {
    expect(Range.fn({ start: 1.000000000006, end: 1.000000000007, step: 1e-13 })).toEqual([]);
    expect(Range.fn({ start: -1.000000000006, end: -1.000000000007, step: -1e-13 })).toEqual([]);
  });

  it("rejects enormous counts without allocating or repeatedly decrementing", () => {
    expect(value("@Range(0, 100000)")).toBeNull();
    expect(() => Range.fn({ start: -1e308, end: 1e308, step: 1 })).toThrow(/more than/);
  });
});
