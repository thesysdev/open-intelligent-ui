"use client";

import { defineComponent } from "@openuidev/react-lang";
import { useId, useState } from "react";
import { z } from "zod/v4";
import { RangeInput } from "./controls";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const amount = (value: number | undefined, fallback = 0) =>
  Number.isFinite(value) ? Math.max(0, value!) : fallback;
const currencyCode = (value = "USD") =>
  /^[A-Z]{3}$/.test(value) ? value : "USD";
function money(value: number, currency = "USD", digits = 2) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode(currency),
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);
  } catch {
    return `$${value.toFixed(digits)}`;
  }
}

/** Allocate integer cents by largest remainder, so displayed shares always sum exactly. */
export function allocateCents(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const exact = weights.map((weight) => (total * weight) / sum);
  const result = exact.map(Math.floor);
  const order = exact
    .map((value, i) => ({ i, remainder: value - result[i] }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (
    let i = 0, remaining = total - result.reduce((a, b) => a + b, 0);
    i < remaining;
    i++
  )
    result[order[i % order.length].i]++;
  return result;
}

function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "fallback">("idle");
  return (
    <div className="iui-tools-copy">
      <button
        type="button"
        className="iui-tools-button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus("copied");
            window.setTimeout(() => setStatus("idle"), 2500);
          } catch {
            setStatus("fallback");
          }
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <rect x="8" y="8" width="12" height="12" rx="3" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </svg>
        <span aria-live="polite">{status === "copied" ? "Copied" : label}</span>
      </button>
      {status === "fallback" && (
        <label className="iui-tools-field">
          Select and copy
          <textarea
            readOnly
            value={text}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}

type BillItem = { name: string; amount: number; people: number[] };
export type BillSplitterProps = {
  title: string;
  currency: string;
  people: string[];
  items: BillItem[];
  taxPercent: number;
  tipPercent: number;
};
const billSample: BillSplitterProps = {
  title: "The Check, Please.",
  currency: "USD",
  people: ["You", "Alex", "Sam", "Jordan"],
  items: [
    { name: "Burrata & sourdough", amount: 18, people: [0, 1, 2, 3] },
    { name: "Mains", amount: 96, people: [0, 1, 2, 3] },
    { name: "A bottle of red", amount: 42, people: [0, 1, 3] },
  ],
  taxPercent: 8.5,
  tipPercent: 20,
};

export function BillSplitterView(props: Partial<BillSplitterProps> = {}) {
  const id = useId();
  const currency = props.currency || billSample.currency;
  const initialPeople = props.people
    ?.filter((name) => typeof name === "string")
    .slice(0, 12);
  const [people, setPeople] = useState(
    initialPeople?.length ? initialPeople : billSample.people,
  );
  const [items, setItems] = useState<BillItem[]>(() =>
    (props.items ?? billSample.items).filter(Boolean).map((item) => ({
      name: item.name || "",
      amount: amount(item.amount),
      people: Array.isArray(item.people) ? item.people : [],
    })),
  );
  const [tax, setTax] = useState(
    amount(props.taxPercent, billSample.taxPercent),
  );
  const [tip, setTip] = useState(
    amount(props.tipPercent, billSample.tipPercent),
  );
  const [mode, setMode] = useState<"items" | "equal">("items");
  const cents = items.map((item) => Math.round(item.amount * 100));
  const subtotal = cents.reduce((a, b) => a + b, 0);
  const taxCents = Math.round((subtotal * tax) / 100);
  const tipCents = Math.round((subtotal * tip) / 100);
  const total = subtotal + taxCents + tipCents;
  const food = Array<number>(people.length).fill(0);
  items.forEach((item, index) =>
    allocateCents(
      cents[index],
      people.map((_, person) =>
        mode === "equal" || item.people.includes(person) ? 1 : 0,
      ),
    ).forEach((share, person) => {
      food[person] += share;
    }),
  );
  const unassigned =
    mode === "items" &&
    items.some(
      (item) =>
        item.amount > 0 &&
        !item.people.some((person) => person >= 0 && person < people.length),
    );
  const extras = allocateCents(taxCents + tipCents, food);
  const shares =
    mode === "equal"
      ? allocateCents(
          total,
          people.map(() => 1),
        )
      : food.map((value, index) => value + extras[index]);
  const changeItem = (index: number, update: Partial<BillItem>) =>
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...update } : item)),
    );
  const copy = `${props.title || billSample.title}\n${people.map((person, i) => `${person || `Person ${i + 1}`}: ${money(shares[i] / 100, currency)}`).join("\n")}\nTotal: ${money(total / 100, currency)} (tax ${tax}%, tip ${tip}%)`;
  return (
    <section
      className="iui iui-panel iui-tools iui-tools-bill"
      aria-label="Bill splitter"
    >
      <header className="iui-tools-header">
        <h2 className="iui-heading">{props.title || billSample.title}</h2>
        <p className="iui-muted">A fair share for everyone at the table.</p>
      </header>
      <div className="iui-tools-section">
        <div className="iui-tools-row">
          <h3>Who’s at the table?</h3>
          <span className="iui-tools-caption">{people.length} people</span>
        </div>
        <div className="iui-tools-people">
          {people.map((person, index) => (
            <div className="iui-tools-person-input" key={index}>
              <span className="iui-tools-avatar" aria-hidden="true">
                {(person || "?").slice(0, 1)}
              </span>
              <input
                aria-label={`Person ${index + 1} name`}
                value={person}
                maxLength={40}
                onChange={(event) =>
                  setPeople((current) =>
                    current.map((name, i) =>
                      i === index ? event.target.value : name,
                    ),
                  )
                }
              />
              {people.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove ${person || `person ${index + 1}`}`}
                  className="iui-tools-icon-button"
                  onClick={() => {
                    setPeople((current) =>
                      current.filter((_, i) => i !== index),
                    );
                    setItems((current) =>
                      current.map((item) => ({
                        ...item,
                        people: item.people
                          .filter((i) => i !== index)
                          .map((i) => (i > index ? i - 1 : i)),
                      })),
                    );
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {people.length < 12 && (
            <button
              type="button"
              className="iui-tools-button iui-tools-add-person"
              onClick={() =>
                setPeople((current) => [
                  ...current,
                  `Person ${current.length + 1}`,
                ])
              }
            >
              + Add person
            </button>
          )}
        </div>
      </div>
      <div className="iui-tools-section">
        <div className="iui-tools-row iui-tools-wrap">
          <h3>What did you order?</h3>
          <div className="iui-tools-segment" aria-label="Split method">
            {(["items", "equal"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {value === "items" ? "By item" : "Equally"}
              </button>
            ))}
          </div>
        </div>
        <div className="iui-tools-orders">
          {items.map((item, index) => (
            <div className="iui-tools-order" key={index}>
              <div className="iui-tools-order-fields">
                <input
                  aria-label={`Item ${index + 1} name`}
                  value={item.name}
                  placeholder="Dish or drink"
                  onChange={(event) =>
                    changeItem(index, { name: event.target.value })
                  }
                />
                <label className="iui-tools-price-field">
                  <span>{currencyCode(currency)}</span>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="0.01"
                    aria-label={`Item ${index + 1} amount`}
                    value={item.amount}
                    onChange={(event) =>
                      changeItem(index, {
                        amount: clamp(Number(event.target.value), 0, 100000),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="iui-tools-icon-button"
                  aria-label={`Remove ${item.name || `item ${index + 1}`}`}
                  onClick={() =>
                    setItems((current) => current.filter((_, i) => i !== index))
                  }
                >
                  ×
                </button>
              </div>
              {mode === "items" && (
                <div
                  className="iui-tools-diners"
                  aria-label={`People sharing ${item.name || `item ${index + 1}`}`}
                >
                  {people.map((person, personIndex) => (
                    <label key={personIndex}>
                      <input
                        type="checkbox"
                        checked={item.people.includes(personIndex)}
                        onChange={(event) =>
                          changeItem(index, {
                            people: event.target.checked
                              ? [...item.people, personIndex]
                              : item.people.filter((i) => i !== personIndex),
                          })
                        }
                      />
                      <span>{person || `Person ${personIndex + 1}`}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="iui-tools-text-button"
          onClick={() =>
            setItems((current) => [
              ...current,
              { name: "", amount: 0, people: people.map((_, i) => i) },
            ])
          }
        >
          + Add an item
        </button>
      </div>
      <div className="iui-tools-section iui-tools-tax-tip">
        <label className="iui-tools-field" htmlFor={`${id}-tax`}>
          Tax{" "}
          <span className="iui-tools-number-affix">
            <input
              id={`${id}-tax`}
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={tax}
              onChange={(event) =>
                setTax(clamp(Number(event.target.value), 0, 100))
              }
            />
            <span>%</span>
          </span>
        </label>
        <div className="iui-tools-field">
          <label htmlFor={`${id}-tip`}>Tip on food & drinks</label>
          <div className="iui-tools-tip-presets">
            {[15, 18, 20, 25].map((value) => (
              <button
                type="button"
                className="iui-tools-button"
                aria-pressed={tip === value}
                onClick={() => setTip(value)}
                key={value}
              >
                {value}%
              </button>
            ))}
            <span className="iui-tools-number-affix">
              <input
                id={`${id}-tip`}
                type="number"
                min="0"
                max="100"
                value={tip}
                onChange={(event) =>
                  setTip(clamp(Number(event.target.value), 0, 100))
                }
              />
              <span>%</span>
            </span>
          </div>
        </div>
      </div>
      <div className="iui-tools-summary">
        <div className="iui-tools-row">
          <span>Food & drinks</span>
          <span>{money(subtotal / 100, currency)}</span>
        </div>
        <div className="iui-tools-row iui-tools-caption">
          <span>Tax · {tax}%</span>
          <span>{money(taxCents / 100, currency)}</span>
        </div>
        <div className="iui-tools-row iui-tools-caption">
          <span>Tip · {tip}%</span>
          <span>{money(tipCents / 100, currency)}</span>
        </div>
        <div className="iui-tools-row iui-tools-total">
          <span>Total</span>
          <strong>{money(total / 100, currency)}</strong>
        </div>
      </div>
      {unassigned ? (
        <p className="iui-tools-notice" role="status">
          Choose at least one person for each item to calculate everyone’s
          share.
        </p>
      ) : (
        <div className="iui-tools-section">
          <div className="iui-tools-row">
            <h3>Everyone’s share</h3>
            <CopyButton text={copy} label="Copy split" />
          </div>
          <div className="iui-tools-shares" aria-live="polite">
            {people.map((person, index) => (
              <div key={index}>
                <span className="iui-tools-avatar" aria-hidden="true">
                  {(person || "?").slice(0, 1)}
                </span>
                <span>{person || `Person ${index + 1}`}</span>
                <strong>{money(shares[index] / 100, currency)}</strong>
              </div>
            ))}
          </div>
          <p className="iui-tools-caption">
            Tax and tip follow each person’s share. Rounded to the cent, with
            everything accounted for.
          </p>
        </div>
      )}
    </section>
  );
}

export type SavingsCalculatorProps = {
  title: string;
  currency: string;
  initialSavings: number;
  monthlyContribution: number;
  years: number;
  annualReturn: number;
};
const savingsSample: SavingsCalculatorProps = {
  title: "Retirement savings calculator",
  currency: "USD",
  initialSavings: 0,
  monthlyContribution: 500,
  years: 30,
  annualReturn: 5,
};
export function projectSavings(
  initial: number,
  monthly: number,
  years: number,
  annualRate: number,
) {
  const points = [{ year: 0, balance: initial, contributed: initial }];
  let balance = initial;
  for (let month = 1; month <= years * 12; month++) {
    balance = balance * (1 + annualRate / 1200) + monthly;
    if (month % 12 === 0)
      points.push({
        year: month / 12,
        balance,
        contributed: initial + monthly * month,
      });
  }
  return points;
}
export function SavingsCalculatorView(
  props: Partial<SavingsCalculatorProps> = {},
) {
  const id = useId();
  const [initial, setInitial] = useState(
    amount(props.initialSavings, savingsSample.initialSavings),
  );
  const [monthly, setMonthly] = useState(
    amount(props.monthlyContribution, savingsSample.monthlyContribution),
  );
  const [years, setYears] = useState(
    clamp(props.years ?? savingsSample.years, 1, 50),
  );
  const [rate, setRate] = useState(
    clamp(props.annualReturn ?? savingsSample.annualReturn, 0, 15),
  );
  const currency = props.currency || "USD";
  const [chart, setChart] = useState(false);
  const points = projectSavings(initial, monthly, years, rate);
  const final = points[points.length - 1];
  const max = Math.max(final.balance * 1.12, 1);
  const x = (year: number) => 60 + (year / years) * 500;
  const y = (value: number) => 214 - (value / max) * 185;
  const line = points
    .map((point, i) => `${i ? "L" : "M"} ${x(point.year)} ${y(point.balance)}`)
    .join(" ");
  const deposits = points
    .map(
      (point, i) => `${i ? "L" : "M"} ${x(point.year)} ${y(point.contributed)}`,
    )
    .join(" ");
  const controls = [
    {
      key: "initial",
      label: "Starting savings",
      value: initial,
      set: setInitial,
      max: 100000,
      step: 1000,
      format: (value: number) => money(value, currency, 0),
    },
    {
      key: "monthly",
      label: "Monthly contribution",
      value: monthly,
      set: setMonthly,
      max: 3000,
      step: 50,
      format: (value: number) => money(value, currency, 0),
    },
    {
      key: "years",
      label: "Time to grow",
      value: years,
      set: setYears,
      min: 1,
      max: 50,
      step: 1,
      format: (value: number) => `${value} ${value === 1 ? "year" : "years"}`,
    },
    {
      key: "return",
      label: "Annual return",
      value: rate,
      set: setRate,
      max: 15,
      step: 0.5,
      format: (value: number) => `${value}%`,
    },
  ];
  return (
    <section
      className="iui iui-panel iui-tools iui-tools-savings"
      aria-label="Savings calculator"
    >
      <header className="iui-tools-header">
        <h2 className="iui-heading">{props.title || savingsSample.title}</h2>
        <p className="iui-muted">
          See how consistency and compound growth add up.
        </p>
      </header>
      <div className="iui-tools-projection" aria-live="polite">
        <span className="iui-tools-caption">
          Projected savings in {years} {years === 1 ? "year" : "years"}
        </span>
        <strong>{money(final.balance, currency, 0)}</strong>
        <span className="iui-tools-caption">
          {money(final.balance - final.contributed, currency, 0)} in potential
          growth
        </span>
      </div>
      <div className="iui-tools-savings-breakdown">
        <div
          className="iui-tools-balance-bar"
          role="img"
          aria-label={`Contributions ${money(final.contributed, currency, 0)}, investment growth ${money(final.balance - final.contributed, currency, 0)}`}
        >
          <span
            style={{
              width: `${final.balance ? (final.contributed / final.balance) * 100 : 0}%`,
            }}
          />
          <span />
        </div>
        <div className="iui-tools-row">
          <div>
            <span className="iui-tools-caption">
              <i />
              Your contributions
            </span>
            <strong>{money(final.contributed, currency, 0)}</strong>
          </div>
          <div>
            <span className="iui-tools-caption">
              <i />
              Investment growth
            </span>
            <strong>
              {money(final.balance - final.contributed, currency, 0)}
            </strong>
          </div>
        </div>
        <button
          type="button"
          className="iui-tools-text-button"
          aria-expanded={chart}
          onClick={() => setChart((value) => !value)}
        >
          {chart ? "Hide growth chart" : "Explore growth over time"}{" "}
          {chart ? "−" : "+"}
        </button>
      </div>
      {chart && (
        <div className="iui-tools-chart">
          <svg
            viewBox="0 0 590 260"
            role="img"
            aria-label={`Savings grow from ${money(initial, currency, 0)} to ${money(final.balance, currency, 0)} over ${years} years. Contributions total ${money(final.contributed, currency, 0)}.`}
          >
            <defs>
              <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2f8f75" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#2f8f75" stopOpacity="0.015" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <g key={fraction}>
                <line
                  x1="60"
                  x2="560"
                  y1={y(max * fraction)}
                  y2={y(max * fraction)}
                  stroke="var(--iui-border, #e5e5e5)"
                  strokeDasharray="3 5"
                />
                <text x="48" y={y(max * fraction) + 4} textAnchor="end">
                  {new Intl.NumberFormat("en-US", {
                    notation: "compact",
                    maximumFractionDigits: 0,
                  }).format(max * fraction)}
                </text>
              </g>
            ))}
            <path
              d={`${line} L 560 214 L 60 214 Z`}
              fill={`url(#${id}-fill)`}
            />
            <path
              d={deposits}
              fill="none"
              stroke="#a8aaa8"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <path
              d={line}
              fill="none"
              stroke="#298369"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx="560"
              cy={y(final.balance)}
              r="5"
              fill="#298369"
              stroke="var(--iui-canvas, white)"
              strokeWidth="2"
            />
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <text
                x={x(years * fraction)}
                y="241"
                textAnchor="middle"
                key={fraction}
              >
                {fraction === 0
                  ? "Today"
                  : `Year ${Math.round(years * fraction)}`}
              </text>
            ))}
          </svg>
          <div className="iui-tools-chart-legend">
            <span>
              <i />
              Projected balance
            </span>
            <span>
              <i />
              Your contributions
            </span>
          </div>
        </div>
      )}
      <div className="iui-tools-sliders">
        {controls.map((control) => (
          <label
            className="iui-tools-slider"
            key={control.key}
            htmlFor={`${id}-${control.key}`}
          >
            <span className="iui-tools-row">
              <span>{control.label}</span>
              <strong>{control.format(control.value)}</strong>
            </span>
            <RangeInput
              id={`${id}-${control.key}`}
              aria-label={control.label}
              aria-valuetext={control.format(control.value)}
              min={control.min ?? 0}
              max={Math.max(control.max, control.value)}
              step={control.step}
              value={control.value}
              onChange={(event) => control.set(Number(event.target.value))}
            />
            <span className="iui-tools-row iui-tools-caption">
              <span>{control.format(control.min ?? 0)}</span>
              <span>
                {control.format(Math.max(control.max, control.value))}
              </span>
            </span>
          </label>
        ))}
      </div>
      <p className="iui-tools-caption iui-tools-footnote">
        An illustration, not a guaranteed return. Assumes monthly compounding
        and contributions at the end of each month; excludes fees, taxes and
        inflation.
      </p>
    </section>
  );
}

type Ingredient = { name: string; quantity: number; unit: string };
type CookingStep = { time: string; title: string; description: string };
type Dish = { name: string; description: string; imageUrl: string };
export type RecipePlannerProps = {
  title: string;
  description: string;
  baseGuests: number;
  ingredients: Ingredient[];
  steps: CookingStep[];
  dishes: Dish[];
};
const recipeSample: RecipePlannerProps = {
  title: "Sunday roast with friends",
  description:
    "Rosemary and garlic lamb, golden potatoes, and all the good things on the side. A generous menu that grows with your guest list.",
  baseGuests: 6,
  dishes: [
    {
      name: "Rosemary & garlic lamb",
      description: "The centerpiece, with homemade gravy and mint sauce.",
      imageUrl:
        "https://images.openai.com/static-rsc-4/8v3eZl34X8vjJW3WQLn2zntva7iUjGDHgwIdA_3e5UPtfwEQoFlGjWU5hSwgYRsfik8H-p1NOKsCAtKLuY3AQX8R_Ur2WkfzttPqjFPjDOzhAtYcRVPIli4xOuvUKuTDQiQgXzyLtQra2bC9lriSlOv_7hHMq6BJmXiTQQd8KaY?purpose=inline",
    },
    {
      name: "Extra-crispy potatoes",
      description: "Fluffy inside. Golden edges. Plenty for seconds.",
      imageUrl:
        "https://images.openai.com/static-rsc-4/6FUj2TIQq4Wxxg1yncj0d5FPaGvRiB1ZcsIyi6NwJmN0te4yRsCT5RBU0yPnPQYA7g22J2DdY0SmTuwYUofy1gLGZS9XbgV8H1nIsTHwoImX5ObzOmNpAaSZ3RZEExf-RyTv9f-R6K7jlDOo4yasem06e5xdZnuXg47rsLFmDcc?purpose=inline",
    },
    {
      name: "Honey-roasted vegetables",
      description: "Carrots and parsnips with fresh thyme.",
      imageUrl:
        "https://images.openai.com/static-rsc-4/6kx7npHz0pB8BklzBdP-RtER3OgghMOZ-Jkp67t7bxM7Eg143kmr5UmsjiT7WQN6DU-zqlqJhQsqvnQmHuzr3wy-WMxYw7eNlmcacNjgxuHxeEUJKBiQo1hJXmlK_skHKi2yk-EaRTmO3WWp4J5h-wuXWRZZ2oBejxDPn2SkLw8?purpose=inline",
    },
  ],
  ingredients: [
    { name: "Bone-in leg of lamb", quantity: 2.4, unit: "kg" },
    { name: "Potatoes", quantity: 1800, unit: "g" },
    { name: "Carrots", quantity: 9, unit: "" },
    { name: "Parsnips", quantity: 6, unit: "" },
    { name: "Tenderstem broccoli", quantity: 750, unit: "g" },
    { name: "Apples for crumble", quantity: 5, unit: "" },
  ],
  steps: [
    {
      time: "Saturday",
      title: "Get ahead",
      description: "Make the crumble, prepare the marinade and set the table.",
    },
    {
      time: "12:30 PM",
      title: "Prepare the lamb",
      description:
        "Season with garlic, rosemary, lemon and olive oil. Refrigerate until ready to roast.",
    },
    {
      time: "1:30 PM",
      title: "Start roasting",
      description:
        "Preheat the oven and start the lamb. Check with a meat thermometer; the time depends on your joint.",
    },
    {
      time: "2:30 PM",
      title: "Prepare the sides",
      description:
        "Peel and chop vegetables. Parboil the potatoes, drain and rough up the edges.",
    },
    {
      time: "3:30 PM",
      title: "Rest and roast",
      description:
        "Once cooked, rest the lamb loosely covered. Roast the potatoes and vegetables.",
    },
    {
      time: "4:15 PM",
      title: "Bring it together",
      description: "Make gravy, cook the greens and warm your serving dishes.",
    },
    {
      time: "4:45 PM",
      title: "Carve and serve",
      description: "Carve the lamb and bring everything to the table.",
    },
    {
      time: "5:00 PM",
      title: "Enjoy your Sunday",
      description:
        "Dinner is served. Reheat the crumble while everyone finishes.",
    },
  ],
};
function FoodIllustration({ index }: { index: number }) {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label={
        index === 0
          ? "Roast served on a platter"
          : "Roasted vegetables on a plate"
      }
    >
      <rect width="240" height="160" fill="#e7ded0" />
      <ellipse
        cx="122"
        cy="87"
        rx="93"
        ry="56"
        fill="#f6f2e9"
        stroke="#d9d1c5"
      />
      {index === 0 ? (
        <>
          <path
            d="M67 99c-15-32 9-63 50-54 16-10 55 8 50 30l24 24-17 17-27-18c-18 20-59 24-80 1Z"
            fill="#765036"
          />
          <path
            d="m76 78 70-14m-65 29 75-17m-60 30 61-15"
            stroke="#ae7650"
            strokeWidth="5"
          />
          <path
            d="m109 48 27 62m-8-54-17 6m20 9-16 6m23 11-14 6"
            stroke="#56674d"
            strokeWidth="3"
          />
        </>
      ) : (
        Array.from({ length: 11 }, (_, i) => (
          <ellipse
            key={i}
            cx={65 + (i % 4) * 36 + Math.floor(i / 4) * 5}
            cy={57 + Math.floor(i / 4) * 27}
            rx={index === 1 ? 18 : 11}
            ry={index === 1 ? 13 : 24}
            transform={`rotate(${i * 31}, ${65 + (i % 4) * 36}, ${57 + Math.floor(i / 4) * 27})`}
            fill={
              index === 1
                ? ["#cd9e4b", "#e0b35f", "#d5a553"][i % 3]
                : ["#ce853a", "#ddb579"][i % 2]
            }
          />
        ))
      )}
    </svg>
  );
}
function DishImage({ dish, index }: { dish: Dish; index: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="iui-tools-food-image">
      {dish.imageUrl && !failed ? (
        <img
          src={dish.imageUrl}
          alt={dish.name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <FoodIllustration index={index} />
      )}
    </div>
  );
}
export function RecipePlannerView(props: Partial<RecipePlannerProps> = {}) {
  const baseGuests = clamp(props.baseGuests ?? 6, 1, 30);
  const [guests, setGuests] = useState(baseGuests);
  const [checked, setChecked] = useState<number[]>([]);
  const [tab, setTab] = useState<"shopping" | "timeline">("shopping");
  const ingredients = (props.ingredients ?? recipeSample.ingredients).filter(
    Boolean,
  );
  const steps = (props.steps ?? recipeSample.steps).filter(Boolean);
  const dishes = (props.dishes ?? recipeSample.dishes).filter(Boolean);
  const quantity = (ingredient: Ingredient) => {
    const scaled = (amount(ingredient.quantity) * guests) / baseGuests;
    return `${ingredient.unit ? new Intl.NumberFormat("en-US", { maximumFractionDigits: ingredient.unit === "kg" ? 2 : 1 }).format(scaled) : Math.ceil(scaled)}${ingredient.unit ? ` ${ingredient.unit}` : ""}`;
  };
  const shoppingText = `${props.title || recipeSample.title} — ${guests} people\n${ingredients.map((ingredient) => `${quantity(ingredient)} ${ingredient.name}`).join("\n")}`;
  return (
    <section
      className="iui iui-panel iui-tools iui-tools-recipe"
      aria-label="Recipe planner"
    >
      <header className="iui-tools-header">
        <h2 className="iui-heading">{props.title || recipeSample.title}</h2>
        <p className="iui-muted">
          {props.description || recipeSample.description}
        </p>
      </header>
      <div className="iui-tools-dishes">
        {dishes.map((dish, index) => (
          <article key={`${dish.name}-${index}`}>
            <DishImage dish={dish} index={index} />
            <h3>{dish.name}</h3>
            <p className="iui-tools-caption">{dish.description}</p>
          </article>
        ))}
      </div>
      <div className="iui-tools-guest-count">
        <div>
          <h3>Make room for everyone</h3>
          <p className="iui-tools-caption">
            Shopping quantities adjust with your table.
          </p>
        </div>
        <div className="iui-tools-stepper">
          <button
            type="button"
            aria-label="Remove a guest"
            disabled={guests <= 1}
            onClick={() => setGuests((value) => value - 1)}
          >
            −
          </button>
          <output aria-live="polite">
            {guests}
            <span>{guests === 1 ? "person" : "people"}</span>
          </output>
          <button
            type="button"
            aria-label="Add a guest"
            disabled={guests >= 30}
            onClick={() => setGuests((value) => value + 1)}
          >
            +
          </button>
        </div>
      </div>
      <div
        className="iui-tools-tablist"
        role="tablist"
        aria-label="Dinner plan"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "shopping"}
          onClick={() => setTab("shopping")}
        >
          Shopping list
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "timeline"}
          onClick={() => setTab("timeline")}
        >
          Cooking timeline{" "}
          <span>
            {checked.length}/{steps.length}
          </span>
        </button>
      </div>
      {tab === "shopping" ? (
        <div
          className="iui-tools-shopping"
          role="tabpanel"
          aria-label="Shopping list"
        >
          <dl>
            {ingredients.map((ingredient, index) => (
              <div key={`${ingredient.name}-${index}`}>
                <dt>{ingredient.name}</dt>
                <dd>{quantity(ingredient)}</dd>
              </div>
            ))}
          </dl>
          <div className="iui-tools-row iui-tools-wrap">
            <span className="iui-tools-caption">
              Generous portions, with a little extra.
            </span>
            <CopyButton text={shoppingText} label="Copy shopping list" />
          </div>
        </div>
      ) : (
        <div
          className="iui-tools-timeline"
          role="tabpanel"
          aria-label="Cooking timeline"
        >
          {steps.map((step, index) => (
            <label
              className={checked.includes(index) ? "is-done" : ""}
              key={`${step.title}-${index}`}
            >
              <input
                type="checkbox"
                checked={checked.includes(index)}
                onChange={(event) =>
                  setChecked((current) =>
                    event.target.checked
                      ? [...current, index]
                      : current.filter((i) => i !== index),
                  )
                }
              />
              <time>{step.time}</time>
              <span>
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </span>
            </label>
          ))}
          <p className="iui-tools-caption">
            {dishes.some((dish) => /lamb/i.test(dish.name || ""))
              ? "Timing is a guide; adjust for your joint and oven. Cook whole cuts of lamb to 145°F / 63°C and rest at least 3 minutes."
              : "Timing is a guide; adjust for your ingredients and equipment. Check doneness before serving."}
          </p>
        </div>
      )}
    </section>
  );
}

type GarmentKind = "shirt" | "tee" | "jacket" | "trousers" | "shoes" | "bag";
type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  color: string;
  kind: GarmentKind;
  imageUrl?: string;
};
type Outfit = { name: string; occasion: string; itemIds: string[] };
export type WardrobePlannerProps = {
  title: string;
  description: string;
  items: WardrobeItem[];
  outfits: Outfit[];
};
const wardrobeSample: WardrobePlannerProps = {
  title: "Your capsule wardrobe",
  description:
    "A considered everyday wardrobe. Neutral tones, easy layers, and pieces that work together.",
  items: [
    {
      id: "tee",
      name: "The everyday tee",
      category: "Tops",
      color: "#f3f0e9",
      kind: "tee",
    },
    {
      id: "shirt",
      name: "Relaxed Oxford shirt",
      category: "Tops",
      color: "#c4d4dd",
      kind: "shirt",
    },
    {
      id: "jacket",
      name: "Unstructured jacket",
      category: "Layers",
      color: "#aaa18c",
      kind: "jacket",
    },
    {
      id: "trousers",
      name: "Straight-leg trousers",
      category: "Bottoms",
      color: "#42484c",
      kind: "trousers",
    },
    {
      id: "shoes",
      name: "Minimal leather sneakers",
      category: "Shoes",
      color: "#eeeae2",
      kind: "shoes",
    },
    {
      id: "bag",
      name: "Everywhere tote",
      category: "Accessories",
      color: "#847b5a",
      kind: "bag",
    },
  ],
  outfits: [
    {
      name: "An easy Saturday",
      occasion: "Weekend",
      itemIds: ["tee", "trousers", "shoes", "bag"],
    },
    {
      name: "A little more polished",
      occasion: "Work",
      itemIds: ["shirt", "jacket", "trousers", "shoes"],
    },
    {
      name: "Dinner, no overthinking",
      occasion: "Evening",
      itemIds: ["tee", "jacket", "trousers", "shoes"],
    },
  ],
};
function Garment({ item }: { item: WardrobeItem }) {
  const color = /^#[a-fA-F0-9]{3,8}$/.test(item.color || "")
    ? item.color
    : "#b7b1a3";
  return (
    <svg
      viewBox="0 0 220 200"
      role="img"
      aria-label={item.name}
      className="iui-tools-garment"
    >
      <ellipse cx="110" cy="178" rx="58" ry="6" fill="#000" opacity=".055" />
      <g
        fill={color}
        stroke="#000"
        strokeOpacity=".13"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        {item.kind === "trousers" ? (
          <>
            <path d="m76 27 67 0 9 143-36 2-9-97-9 97-35-2Z" />
            <path
              d="M77 36h67m-36-9v50m-31-38 13 4-13 20m65-24-13 4 16 19M82 74l-7 91m58-91 6 91"
              fill="none"
            />
            <path d="M100 29v9m-18-9v9m47-9v9" strokeWidth="3" />
          </>
        ) : item.kind === "shoes" ? (
          <>
            <path d="m42 91 35-25 26 23 28 22 44 10c18 5 25 18 16 28-14 14-91 4-145-14-10-5-12-24-4-44Z" />
            <path
              d="m42 122 33 13c46 17 89 21 119 9v12c-30 17-85 2-150-19Z"
              fill="#e7e5de"
            />
            <path
              d="m85 83-22 14m31-6-22 13m32-6-21 13m31-6-20 13m-42-6 18 16m58-6 30 10"
              fill="none"
              stroke="#a5a29a"
              strokeWidth="3"
            />
            <path d="M46 88c9 14 18 13 26 8l17-12" fill="#d8d5cd" />
          </>
        ) : item.kind === "bag" ? (
          <>
            <path d="m57 67 105-3 12 104c-35 10-83 12-127 0Z" />
            <path
              d="M79 79V44c0-31 60-32 60-1v35"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeOpacity="1"
            />
            <path d="m64 83-7 76m96-77 8 76M53 164q57 10 112 0" fill="none" />
          </>
        ) : (
          <>
            <path
              d={
                item.kind === "jacket"
                  ? "m78 37 21-10h22l23 10 33 87-23 10-17-47 6 81H78l6-80-20 48-23-10Z"
                  : "m78 43 20-14h24l22 14 41 30-21 33-27-15 5 76H77l6-76-27 15-22-32Z"
              }
            />
            {item.kind === "tee" ? (
              <>
                <path d="M95 31c-1 27 33 28 30 0" fill="none" strokeWidth="3" />
                <path d="M81 161h57M54 100l-15-25m125 25 15-25" fill="none" />
              </>
            ) : (
              <>
                <path
                  d="m98 28 12 21-16 24-15-31m43-14-12 21 16 24 19-32"
                  fill={item.kind === "jacket" ? "#99917f" : color}
                />
                <path
                  d="M110 50v117M84 104l16 0v20H85m36-20h15v20h-15"
                  fill="none"
                />
                {[85, 111, 143].map((cy) => (
                  <circle
                    key={cy}
                    cx="113"
                    cy={cy}
                    r="1.8"
                    fill="#000"
                    opacity=".4"
                  />
                ))}
              </>
            )}
            <path
              d="m84 95 3 49m46-49-4 47"
              fill="none"
              strokeOpacity=".06"
              strokeWidth="3"
            />
          </>
        )}
      </g>
    </svg>
  );
}
function WardrobeImage({ item }: { item: WardrobeItem }) {
  const [failed, setFailed] = useState(false);
  return item.imageUrl && !failed ? (
    <img
      src={item.imageUrl}
      alt={item.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <Garment item={item} />
  );
}
export function WardrobePlannerView(props: Partial<WardrobePlannerProps> = {}) {
  const id = useId();
  const items = (props.items ?? wardrobeSample.items).filter(
    (item) => item?.id && item?.name,
  );
  const outfits = (props.outfits ?? wardrobeSample.outfits).filter(Boolean);
  const [category, setCategory] = useState("All pieces");
  const [outfit, setOutfit] = useState<number | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [packed, setPacked] = useState<string[]>([]);
  const [weather, setWeather] = useState("Mild");
  const [tripDays, setTripDays] = useState("5 days");
  const [occasion, setOccasion] = useState(outfits[0]?.occasion || "Every day");
  const [packingIds, setPackingIds] = useState<string[] | null>(null);
  const [packingNote, setPackingNote] = useState("");
  const categories = [
    "All pieces",
    ...new Set(items.map((item) => item.category || "Other")),
  ];
  const selectedOutfit = outfit === null ? undefined : outfits[outfit];
  const visible = items.filter(
    (item) =>
      (category === "All pieces" || item.category === category) &&
      (!selectedOutfit || selectedOutfit.itemIds?.includes(item.id)),
  );
  const packingItems = items.filter(
    (item) => !packingIds || packingIds.includes(item.id),
  );
  const packedCount = packingItems.filter((item) =>
    packed.includes(item.id),
  ).length;
  return (
    <section
      className="iui iui-panel iui-tools iui-tools-wardrobe"
      aria-label="Wardrobe planner"
    >
      <header className="iui-tools-header">
        <h2 className="iui-heading">{props.title || wardrobeSample.title}</h2>
        <p className="iui-muted">
          {props.description || wardrobeSample.description}
        </p>
      </header>
      <div className="iui-tools-filters" aria-label="Filter wardrobe">
        {categories.map((value) => (
          <button
            type="button"
            className="iui-tools-button"
            aria-pressed={category === value}
            onClick={() => {
              setCategory(value);
              setOutfit(null);
            }}
            key={value}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="iui-tools-wardrobe-grid">
        {visible.map((item) => (
          <article key={item.id}>
            <div className="iui-tools-wardrobe-image">
              <WardrobeImage item={item} />
              <button
                className="iui-tools-save"
                type="button"
                aria-pressed={saved.includes(item.id)}
                aria-label={`${saved.includes(item.id) ? "Unsave" : "Save"} ${item.name}`}
                onClick={() =>
                  setSaved((current) =>
                    current.includes(item.id)
                      ? current.filter((id) => id !== item.id)
                      : [...current, item.id],
                  )
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill={saved.includes(item.id) ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 4h12v17l-6-4-6 4Z" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="iui-tools-row">
              <h3>{item.name}</h3>
              <span
                className="iui-tools-swatch"
                style={{
                  background: /^#[a-fA-F0-9]{3,8}$/.test(item.color || "")
                    ? item.color
                    : "#b7b1a3",
                }}
                aria-label={`Color ${item.color}`}
              />
            </div>
            <p className="iui-tools-caption">{item.category}</p>
          </article>
        ))}
      </div>
      {!visible.length && (
        <p className="iui-tools-caption">
          No pieces in this selection. Choose another category.
        </p>
      )}
      <div className="iui-tools-section">
        <div className="iui-tools-row">
          <h3>Put it together</h3>
          {selectedOutfit && (
            <button
              className="iui-tools-text-button"
              type="button"
              onClick={() => setOutfit(null)}
            >
              Show all pieces
            </button>
          )}
        </div>
        <div className="iui-tools-outfits">
          {outfits.map((look, index) => (
            <button
              key={`${look.name}-${index}`}
              type="button"
              aria-pressed={outfit === index}
              onClick={() => {
                setOutfit(outfit === index ? null : index);
                setCategory("All pieces");
              }}
            >
              <span className="iui-tools-outfit-swatches">
                {(look.itemIds || []).slice(0, 4).map((id) => {
                  const item = items.find((piece) => piece.id === id);
                  return item ? (
                    <span
                      key={id}
                      style={{
                        background: /^#[a-fA-F0-9]{3,8}$/.test(item.color || "")
                          ? item.color
                          : "#b7b1a3",
                      }}
                    />
                  ) : null;
                })}
              </span>
              <span>
                <strong>{look.name}</strong>
                <span className="iui-tools-caption">
                  {look.occasion} · {look.itemIds?.length || 0} pieces
                </span>
              </span>
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
        <p className="iui-tools-caption" aria-live="polite">
          {selectedOutfit
            ? `Showing the pieces for “${selectedOutfit.name}”. `
            : `${items.length} versatile pieces. `}
          {saved.length
            ? `${saved.length} saved to your shortlist.`
            : "Save your favorites to build a shortlist."}
        </p>
        {saved.length > 0 && (
          <CopyButton
            label="Copy shortlist"
            text={items
              .filter((item) => saved.includes(item.id))
              .map((item) => `${item.name} — ${item.category}`)
              .join("\n")}
          />
        )}
      </div>
      <section className="iui-tools-packing" aria-label="Packing checklist">
        <div className="iui-tools-row">
          <h3>Your suitcase</h3>
          <span className="iui-tools-caption" aria-live="polite">
            {packedCount}/{packingItems.length} packed
          </span>
        </div>
        <progress
          max={Math.max(packingItems.length, 1)}
          value={packedCount}
          aria-label="Packing progress"
        />
        <div className="iui-tools-packing-list">
          {packingItems.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={packed.includes(item.id)}
                onChange={(event) =>
                  setPacked((current) =>
                    event.target.checked
                      ? [...current, item.id]
                      : current.filter((packedId) => packedId !== item.id),
                  )
                }
              />
              <span>{item.name}</span>
            </label>
          ))}
        </div>
        {packingNote && (
          <p
            className="iui-tools-caption"
            style={{ marginTop: 14 }}
            role="status"
          >
            {packingNote}
          </p>
        )}
      </section>
      <details className="iui-tools-personalize">
        <summary>Make this wardrobe yours</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const lookIndex = outfits.findIndex(
              (look) => look.occasion === occasion,
            );
            const look = outfits[lookIndex];
            const chosen = new Set(
              look?.itemIds || items.map((item) => item.id),
            );
            if (weather === "Cool")
              items
                .filter((item) => item.kind === "jacket")
                .forEach((item) => chosen.add(item.id));
            if (weather === "Warm")
              items
                .filter((item) => item.kind === "jacket")
                .forEach((item) => chosen.delete(item.id));
            items
              .filter((item) => item.kind === "bag")
              .forEach((item) => chosen.add(item.id));
            setPackingIds([...chosen]);
            setSaved([...chosen]);
            setPackingNote(
              `${tripDays} · ${weather.toLowerCase()} weather · ${occasion.toLowerCase()}. ${weather === "Cool" ? "An extra layer is included." : weather === "Warm" ? "Keep it light; the jacket stays home." : "Easy layers for changing temperatures."} Rewear your trousers and shoes; pack ${Math.ceil(parseInt(tripDays) / 2)} changes of tops.`,
            );
          }}
        >
          {[
            {
              name: "days",
              label: "How long?",
              options: ["3 days", "5 days", "7 days"],
              value: tripDays,
              set: setTripDays,
            },
            {
              name: "weather",
              label: "What is the weather like?",
              options: ["Cool", "Mild", "Warm"],
              value: weather,
              set: setWeather,
            },
            {
              name: "occasion",
              label: "What is the dress code?",
              options: [
                ...new Set(
                  outfits.length
                    ? outfits.map((look) => look.occasion)
                    : ["Every day"],
                ),
              ],
              value: occasion,
              set: setOccasion,
            },
          ].map((group) => (
            <fieldset key={group.name}>
              <legend>{group.label}</legend>
              {group.options.map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name={`${id}-${group.name}`}
                    value={option}
                    checked={group.value === option}
                    onChange={() => group.set(option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <button type="submit" className="iui-tools-button">
            Personalize my packing list <span aria-hidden="true">↗</span>
          </button>
        </form>
      </details>
    </section>
  );
}

export const toolSamples = {
  bill: billSample,
  savings: savingsSample,
  recipe: recipeSample,
  wardrobe: wardrobeSample,
};

export const BillSplitter = defineComponent({
  name: "BillSplitter",
  description:
    "Interactive dinner bill splitter with editable people, items, shared-item assignments, equal splitting, tax and tip. Amounts are in currency units, people arrays contain zero-based person indexes. Shows cent-exact totals and copyable shares.",
  props: z.object({
    title: z.string(),
    currency: z.string(),
    people: z.array(z.string()),
    items: z.array(
      z.object({
        name: z.string(),
        amount: z.number(),
        people: z.array(z.number()),
      }),
    ),
    taxPercent: z.number(),
    tipPercent: z.number(),
  }),
  component: ({ props }) => (
    <BillSplitterView key={JSON.stringify(props)} {...props} />
  ),
});
export const SavingsCalculator = defineComponent({
  name: "SavingsCalculator",
  description:
    "Interactive compound savings or retirement calculator with editable sliders, a live growth chart, contributions and growth totals. Calculates monthly compounding and end-of-month contributions. years 1–50, annualReturn as a percentage 0–15. State assumptions; do not present hypothetical growth as guaranteed.",
  props: z.object({
    title: z.string(),
    currency: z.string(),
    initialSavings: z.number(),
    monthlyContribution: z.number(),
    years: z.number(),
    annualReturn: z.number(),
  }),
  component: ({ props }) => (
    <SavingsCalculatorView key={JSON.stringify(props)} {...props} />
  ),
});
export const RecipePlanner = defineComponent({
  name: "RecipePlanner",
  description:
    "Scalable meal planner with illustrated dish cards, a guest stepper, calculated shopping quantities, a copyable shopping list and interactive timed cooking checklist. Ingredient quantities are for baseGuests; use unit empty for whole items, kg or g for weight. Use real image URLs when available, otherwise an empty imageUrl for an illustrated dish.",
  props: z.object({
    title: z.string(),
    description: z.string(),
    baseGuests: z.number(),
    ingredients: z.array(
      z.object({ name: z.string(), quantity: z.number(), unit: z.string() }),
    ),
    steps: z.array(
      z.object({
        time: z.string(),
        title: z.string(),
        description: z.string(),
      }),
    ),
    dishes: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        imageUrl: z.string(),
      }),
    ),
  }),
  component: ({ props }) => (
    <RecipePlannerView key={JSON.stringify(props)} {...props} />
  ),
});
export const WardrobePlanner = defineComponent({
  name: "WardrobePlanner",
  description:
    "Interactive capsule wardrobe with clothing illustrations or supplied real photos, category filters, selectable coordinated outfits, saved favorites and a copyable shortlist. kind determines the illustration. color is a hex color. Outfit itemIds must match item id values. Never invent product prices or shopping links.",
  props: z.object({
    title: z.string(),
    description: z.string(),
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        color: z.string(),
        kind: z.enum(["shirt", "tee", "jacket", "trousers", "shoes", "bag"]),
        imageUrl: z.string().optional(),
      }),
    ),
    outfits: z.array(
      z.object({
        name: z.string(),
        occasion: z.string(),
        itemIds: z.array(z.string()),
      }),
    ),
  }),
  component: ({ props }) => (
    <WardrobePlannerView key={JSON.stringify(props)} {...props} />
  ),
});
