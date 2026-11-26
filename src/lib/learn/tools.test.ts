import { describe, expect, it } from "vitest";
import { learnToolProvider, learnToolSpecs } from "./tools";

describe("get_metrics", () => {
  it("is listed as a tool spec", () => {
    expect(learnToolSpecs.map((s) => s.name)).toEqual(["get_metrics"]);
  });

  it("returns one row per metric with value, previous and a format", async () => {
    const { rows } = (await learnToolProvider.get_metrics({ days: 30 })) as { rows: Record<string, unknown>[] };
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(typeof r.label).toBe("string");
      expect(typeof r.value).toBe("number");
      expect(typeof r.previous).toBe("number");
      expect(["number", "currency", "percent"]).toContain(r.format);
    }
  });

  it("scales with the window but stays deterministic", async () => {
    const a = (await learnToolProvider.get_metrics({ days: 30 })) as { rows: { value: number }[] };
    const b = (await learnToolProvider.get_metrics({ days: 30 })) as { rows: { value: number }[] };
    const c = (await learnToolProvider.get_metrics({ days: 365 })) as { rows: { value: number }[] };
    expect(a.rows.map((r) => r.value)).toEqual(b.rows.map((r) => r.value));
    expect(c.rows[0]!.value).toBeGreaterThan(a.rows[0]!.value);
  });
});
