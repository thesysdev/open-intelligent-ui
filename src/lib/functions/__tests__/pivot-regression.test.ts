import { describe, expect, it } from "vitest";
import { Pivot } from "../data";
import { run, value } from "./run";

describe("@Pivot column names", () => {
  it("preserves object property names such as __proto__ as real output columns", () => {
    const rows = [{ region: "West", category: "__proto__", amount: 3 }];
    const result = Pivot.fn({ rows, rowKey: "region", colKey: "category", field: "amount" });
    expect(result).toEqual([JSON.parse('{"key":"West","__proto__":3}')]);
    expect(Object.hasOwn(result[0]!, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
  });

  it("rejects a column called key instead of silently overwriting the row label", () => {
    const result = run('@Pivot([{r: "West", c: "key", v: 3}], "r", "c", "v")');
    expect(result.value).toBeNull();
    expect(result.runtimeErrors.join()).toMatch(/reserved.*key|key.*reserved/i);
  });

  it("retains zero-filled cells and first-seen category ordering", () => {
    expect(value('@Pivot([{r: "West", c: "constructor", v: 3}, {r: "East", c: "normal", v: 4}], "r", "c", "v")'))
      .toEqual([{ key: "West", constructor: 3, normal: 0 }, { key: "East", constructor: 0, normal: 4 }]);
  });
});
