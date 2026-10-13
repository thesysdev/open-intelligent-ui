import { describe, expect, it } from "vitest";
import { value } from "./run";

describe("@Unique equality by value", () => {
  it("keeps different primitive types except matching numeric ids", () => {
    expect(value('@Unique([true, "true", false, "false", null, "null", 1, "1"])'))
      .toEqual([true, "true", false, "false", null, "null", 1]);
  });

  it("deduplicates nested records regardless of property insertion order", () => {
    expect(value('@Unique([{a: 1, b: {x: 2, y: 3}}, {b: {y: 3, x: "2"}, a: "1"}, {a: 1, b: {x: 2, y: 4}}])'))
      .toEqual([{ a: 1, b: { x: 2, y: 3 } }, { a: 1, b: { x: 2, y: 4 } }]);
  });

  it("agrees with @Includes when deciding whether a later item is redundant", () => {
    expect(value('@Includes([{a: 1, b: 2}], {b: 2, a: 1})')).toBe(true);
    expect(value('@Unique([{a: 1, b: 2}, {b: 2, a: 1}])')).toEqual([{ a: 1, b: 2 }]);
  });
});
