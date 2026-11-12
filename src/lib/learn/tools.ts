import type { ToolSpec } from "@openuidev/lang-core";

// One data tool for the /learn example. Unlike a @function (pure, client-side),
// a tool goes to the server and returns data: the model fetches it with
// Query("get_metrics", {...}) and shapes the rows with @functions.

const days = { type: "number", description: "How many days back from today, 1 to 365 (default 30)" };

export const learnToolSpecs: ToolSpec[] = [
  {
    name: "get_metrics",
    description: "A company's headline metrics for the trailing period, one row per metric with its current value and the previous period's value",
    inputSchema: { type: "object", properties: { days } },
    outputSchema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "number" },
              previous: { type: "number" },
              format: { type: "string", enum: ["number", "currency", "percent"] },
            },
          },
        },
      },
    },
  },
];

// A fixed metric set; value scales gently with the window so the page responds
// to the days input without any randomness. Deterministic, so tests can rely on it.
const METRICS = [
  { label: "Revenue", base: 428000, format: "currency" },
  { label: "Active users", base: 18400, format: "number" },
  { label: "Conversion", base: 3.4, format: "percent" },
  { label: "Churn", base: 2.1, format: "percent" },
] as const;

function metrics(input: unknown): Record<string, unknown>[] {
  const raw = Number((input as { days?: unknown } | null)?.days ?? 30);
  const days = Math.min(365, Math.max(1, Number.isFinite(raw) ? Math.round(raw) : 30));
  const scale = 0.9 + (days / 365) * 0.2; // 0.9 .. 1.1
  return METRICS.map((m) => ({
    label: m.label,
    value: Math.round(m.base * scale * 100) / 100,
    previous: Math.round(m.base * (scale - 0.06) * 100) / 100,
    format: m.format,
  }));
}

export const learnToolProvider: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  get_metrics: async (args) => ({ rows: metrics(args) }),
};
