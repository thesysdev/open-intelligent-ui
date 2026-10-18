import { describe, expect, it } from "vitest";
import { value } from "./run";

describe("four-digit calendar years below 100", () => {
  it("preserves the supplied year instead of applying JavaScript's 1900 offset", () => {
    expect(value('@FormatDate("0001-01-02", "iso")')).toBe("0001-01-02");
    expect(value('@AddDays("0099-12-31", 1)')).toBe("0100-01-01");
    expect(value('@DaysBetween("0099-12-31", "0100-01-01")')).toBe(1);
    expect(value('@FormatDate("0001-01-02T00:00:00Z", "iso")')).toBe("0001-01-02");
  });

  it("uses the Gregorian leap rule for year zero", () => {
    expect(value('@AddDays("0000-02-28", 1)')).toBe("0000-02-29");
    expect(value('@FormatDate("0001-02-29", "iso")')).toBeNull();
  });

  it("keeps month arithmetic and period starts in the original century", () => {
    expect(value('@AddMonths("0099-12-31", 1)')).toBe("0100-01-31");
    expect(value('@AddMonths("0100-01-31", -1)')).toBe("0099-12-31");
    expect(value('@StartOf("0001-06-12", "month")')).toBe("0001-06-01");
    expect(value('@StartOf("0001-06-12", "year")')).toBe("0001-01-01");
    expect(value('@Bucket([{d: "0099-12-31"}, {d: "0100-01-01"}], "d", "month")'))
      .toEqual([{ key: "0099-12", value: 1 }, { key: "0100-01", value: 1 }]);
  });
});
