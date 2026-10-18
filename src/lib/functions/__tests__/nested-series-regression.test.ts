import { describe, expect, it } from "vitest";
import { Cumulative, MovingAvg } from "../data";
import { value } from "./run";

describe("series transforms over nested fields", () => {
  it("writes running totals back to the same nested path it reads", () => {
    expect(value('@Cumulative([{id: 1, metrics: {sales: 2, costs: 1}}, {id: 2, metrics: {sales: 3, costs: 4}}], "metrics.sales")'))
      .toEqual([{ id: 1, metrics: { sales: 2, costs: 1 } }, { id: 2, metrics: { sales: 5, costs: 4 } }]);
  });

  it("writes moving averages into nested fields and leaves source records untouched", () => {
    const rows = [{ metrics: { sales: 2, costs: 1 } }, { metrics: { sales: 6, costs: 4 } }];
    const before = structuredClone(rows);
    expect(MovingAvg.fn({ rows, field: "metrics.sales", window: 2 }))
      .toEqual([{ metrics: { sales: 2, costs: 1 } }, { metrics: { sales: 4, costs: 4 } }]);
    expect(Cumulative.fn({ rows, field: "metrics.sales" }))
      .toEqual([{ metrics: { sales: 2, costs: 1 } }, { metrics: { sales: 8, costs: 4 } }]);
    expect(rows).toEqual(before);
  });

  it("creates absent nested containers while keeping empty-field scalar transforms", () => {
    expect(value('@Cumulative([{metrics: {sales: 2}}, {}], "metrics.sales")'))
      .toEqual([{ metrics: { sales: 2 } }, { metrics: { sales: 2 } }]);
    expect(value('@MovingAvg([2, 6], "", 2)')).toEqual([2, 4]);
  });
});
