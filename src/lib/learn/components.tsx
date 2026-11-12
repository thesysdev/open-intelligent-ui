"use client";

import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";

// A small "company design system" for the /learn tutorial. Each component is a
// thin defineComponent wrapper over plain React: the name the model writes, a
// zod schema for its props, and a prose description that teaches the model
// when and how to use it. Styles live in learn.css, imported by library.ts.

const currencyCode = (currency: string | undefined) =>
  typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : "USD";

function formatValue(value: number, format: "number" | "currency" | "percent" | undefined, currency: string | undefined): string {
  if (format === "percent") return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  if (format === "currency") return value.toLocaleString("en-US", { style: "currency", currency: currencyCode(currency), maximumFractionDigits: 2 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export const KpiCard = defineComponent({
  name: "KpiCard",
  props: z.object({
    label: z.string(),
    value: z.number(),
    format: z.enum(["number", "currency", "percent"]).optional(),
    delta: z.number().optional(),
    currency: z.string().optional(),
  }),
  description:
    "A metric tile: a caption label, a large value, and an optional delta showing the change since the previous period (green when up, red when down). format is number, currency or percent; currency is a code like EUR. Percent values are like 3.4, not 0.034.",
  component: ({ props }) => {
    const value = Number.isFinite(props.value) ? props.value : 0;
    const delta = typeof props.delta === "number" && Number.isFinite(props.delta) ? props.delta : null;
    const up = delta !== null && delta >= 0;
    const sign = delta === null ? "" : up ? "+" : "−";
    return (
      <div className="lrn-kpi">
        <span className="lrn-kpi-label">{props.label}</span>
        <span className="lrn-kpi-value">{formatValue(value, props.format, props.currency)}</span>
        {delta !== null && (
          <span className={`lrn-kpi-delta ${up ? "is-up" : "is-down"}`}>
            {sign}
            {formatValue(Math.abs(delta), props.format, props.currency)}
          </span>
        )}
      </div>
    );
  },
});

export const StatusBadge = defineComponent({
  name: "StatusBadge",
  props: z.object({
    label: z.string(),
    tone: z.enum(["neutral", "success", "warning", "danger", "info"]).optional(),
  }),
  description:
    "A status pill with a colored dot: neutral, success, warning, danger or info. Use it for a row's status, a health-check result or a short label.",
  component: ({ props }) => (
    <span className={`lrn-badge tone-${props.tone ?? "neutral"}`}>
      <i className="lrn-badge-dot" />
      {props.label}
    </span>
  ),
});
