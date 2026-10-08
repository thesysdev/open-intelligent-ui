"use client";

import { defineComponent, reactive, useStateField } from "@openuidev/react-lang";
import { useId, useState } from "react";
import { z } from "zod/v4";
import { RangeInput } from "./controls";
import { allocateCents, buildPackingList, currencyPrecision, projectSavings, readToolRecords, scaleIngredient, toolConfigurationKey, type PackingRuleData, type ScalableIngredient } from "./tools-models";

export { allocateCents, projectSavings } from "./tools-models";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const amount = (value: number | undefined, fallback = 0) =>
  Number.isFinite(value) ? Math.max(0, value!) : fallback;
const currencyCode = (value = "USD") =>
  /^[A-Z]{3}$/.test(value) ? value : "USD";
function money(value: number, currency = "USD", digits = currencyPrecision(currency)) {
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

export type BillItem = { name: string; amount: number; people: number[] };
export type BillSplitterProps = {
  title: string;
  currency: string;
  people: string[];
  items: BillItem[];
  taxPercent: number;
  tipPercent: number;
  description?: string;
  splitMethod?: "items" | "equal";
  tipBasis?: "subtotal" | "after-tax";
  peopleLabel?: string;
  itemsLabel?: string;
  subtotalLabel?: string;
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
  return <BillSplitterSession key={JSON.stringify(props)} {...props} />;
}

function BillSplitterSession(props: Partial<BillSplitterProps> & { taxBinding?: NumberBinding; tipBinding?: NumberBinding }) {
  const id = useId();
  const currency = currencyCode(props.currency || billSample.currency);
  const unit = 10 ** currencyPrecision(currency);
  const initialPeople = props.people
    ?.filter((name) => typeof name === "string")
    .slice(0, 12);
  const [people, setPeople] = useState(
    initialPeople?.length ? initialPeople : billSample.people,
  );
  const [items, setItems] = useState<BillItem[]>(() =>
    (props.items ?? (props.people ? [] : billSample.items)).filter(Boolean).slice(0, 100).map((item) => ({
      name: item.name || "",
      amount: clamp(amount(item.amount), 0, 100000),
      people: Array.isArray(item.people) ? [...new Set(item.people.filter(Number.isInteger))] : [],
    })),
  );
  const [localTax, setLocalTax] = useState(
    clamp(amount(props.taxPercent, billSample.taxPercent), 0, 100),
  );
  const [localTip, setLocalTip] = useState(
    clamp(amount(props.tipPercent, billSample.tipPercent), 0, 100),
  );
  const tax = clamp(props.taxBinding?.value ?? localTax, 0, 100);
  const tip = clamp(props.tipBinding?.value ?? localTip, 0, 100);
  const setTax = props.taxBinding?.setValue ?? setLocalTax;
  const setTip = props.tipBinding?.setValue ?? setLocalTip;
  const [mode, setMode] = useState<"items" | "equal">(props.splitMethod ?? "items");
  const cents = items.map((item) => Math.round(item.amount * unit));
  const subtotal = cents.reduce((a, b) => a + b, 0);
  const taxCents = Math.round((subtotal * tax) / 100);
  const tipCents = Math.round(((subtotal + (props.tipBasis === "after-tax" ? taxCents : 0)) * tip) / 100);
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
  const copy = `${props.title || billSample.title}\n${people.map((person, i) => `${person || `Person ${i + 1}`}: ${money(shares[i] / unit, currency)}`).join("\n")}\nTotal: ${money(total / unit, currency)} (tax ${tax}%, tip ${tip}%)`;
  return (
    <section
      className="iui iui-panel iui-tools iui-tools-bill"
      aria-label="Bill splitter"
    >
      <header className="iui-tools-header">
        <h2 className="iui-heading">{props.title || billSample.title}</h2>
        <p className="iui-muted">{props.description ?? "A fair share for everyone."}</p>
      </header>
      <div className="iui-tools-section">
        <div className="iui-tools-row">
          <h3>{props.peopleLabel ?? "Who’s sharing?"}</h3>
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
          <h3>{props.itemsLabel ?? "What are you splitting?"}</h3>
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
                  placeholder="Item or expense"
                  maxLength={120}
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
                    step={1 / unit}
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
          disabled={items.length >= 100}
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
          <label htmlFor={`${id}-tip`}>{props.tipBasis === "after-tax" ? "Tip after tax" : "Tip on subtotal"}</label>
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
          <span>{props.subtotalLabel ?? "Subtotal"}</span>
          <span>{money(subtotal / unit, currency)}</span>
        </div>
        <div className="iui-tools-row iui-tools-caption">
          <span>Tax · {tax}%</span>
          <span>{money(taxCents / unit, currency)}</span>
        </div>
        <div className="iui-tools-row iui-tools-caption">
          <span>Tip · {tip}%</span>
          <span>{money(tipCents / unit, currency)}</span>
        </div>
        <div className="iui-tools-row iui-tools-total">
          <span>Total</span>
          <strong>{money(total / unit, currency)}</strong>
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
                <strong>{money(shares[index] / unit, currency)}</strong>
              </div>
            ))}
          </div>
          <p className="iui-tools-caption">
            Tax and tip follow each person’s share. Rounded to {currency}’s smallest unit, with everything accounted for.
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
  description?: string;
  contributionTiming?: "start" | "end";
  annualContributionGrowth?: number;
};
const savingsSample: SavingsCalculatorProps = {
  title: "Retirement savings calculator",
  currency: "USD",
  initialSavings: 0,
  monthlyContribution: 500,
  years: 30,
  annualReturn: 5,
};
export function SavingsCalculatorView(
  props: Partial<SavingsCalculatorProps> = {},
) {
  return <SavingsCalculatorSession key={JSON.stringify(props)} {...props} />;
}
type NumberBinding = { value: number; setValue: (value: number) => void };
function SavingsCalculatorSession(
  props: Partial<SavingsCalculatorProps> & { bindings?: Partial<Record<"initial" | "monthly" | "years" | "rate", NumberBinding>> },
) {
  const id = useId();
  const [localInitial, setInitial] = useState(
    clamp(amount(props.initialSavings, savingsSample.initialSavings), 0, 100000000),
  );
  const [localMonthly, setMonthly] = useState(
    clamp(amount(props.monthlyContribution, savingsSample.monthlyContribution), 0, 1000000),
  );
  const [localYears, setYears] = useState(
    clamp(Math.round(props.years ?? savingsSample.years), 1, 80),
  );
  const [localRate, setRate] = useState(
    clamp(props.annualReturn ?? savingsSample.annualReturn, -20, 30),
  );
  const initial = clamp(props.bindings?.initial?.value ?? localInitial, 0, 100000000);
  const monthly = clamp(props.bindings?.monthly?.value ?? localMonthly, 0, 1000000);
  const years = clamp(Math.round(props.bindings?.years?.value ?? localYears), 1, 80);
  const rate = clamp(props.bindings?.rate?.value ?? localRate, -20, 30);
  const currency = props.currency || "USD";
  const [chart, setChart] = useState(false);
  const contributionGrowth = clamp(props.annualContributionGrowth ?? 0, 0, 25);
  const contributionTiming = props.contributionTiming === "start" ? "start" : "end";
  const points = projectSavings(initial, monthly, years, rate, contributionTiming, contributionGrowth);
  const final = points[points.length - 1];
  const max = Math.max(...points.flatMap((point) => [point.balance, point.contributed]), 1) * 1.12;
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
      set: props.bindings?.initial?.setValue ?? setInitial,
      max: 100000,
      step: 1000,
      format: (value: number) => money(value, currency, 0),
    },
    {
      key: "monthly",
      label: "Monthly contribution",
      value: monthly,
      set: props.bindings?.monthly?.setValue ?? setMonthly,
      max: 3000,
      step: 50,
      format: (value: number) => money(value, currency, 0),
    },
    {
      key: "years",
      label: "Time to grow",
      value: years,
      set: props.bindings?.years?.setValue ?? setYears,
      min: 1,
      max: 80,
      step: 1,
      format: (value: number) => `${value} ${value === 1 ? "year" : "years"}`,
    },
    {
      key: "return",
      label: "Annual return",
      value: rate,
      set: props.bindings?.rate?.setValue ?? setRate,
      min: -20,
      max: 30,
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
          {props.description ?? "See how consistency and compound growth add up."}
        </p>
      </header>
      <div className="iui-tools-projection" aria-live="polite">
        <span className="iui-tools-caption">
          Projected savings in {years} {years === 1 ? "year" : "years"}
        </span>
        <strong>{money(final.balance, currency, 0)}</strong>
        <span className="iui-tools-caption">
          {money(Math.abs(final.balance - final.contributed), currency, 0)} in potential {final.balance >= final.contributed ? "growth" : "losses"}
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
              width: `${Math.min(100, final.balance ? (final.contributed / final.balance) * 100 : 0)}%`,
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
        An illustration, not a guaranteed return. Assumes monthly compounding and contributions at the {props.contributionTiming === "start" ? "start" : "end"} of each month{contributionGrowth ? `, increasing ${contributionGrowth}% each year` : ""}; excludes fees, taxes and inflation.
      </p>
    </section>
  );
}

export type Ingredient = ScalableIngredient;
export type CookingStepData = { time: string; title: string; description: string };
export type Dish = { name: string; description: string; imageUrl: string };
export type RecipePlannerProps = {
  title: string;
  description: string;
  baseGuests: number;
  ingredients: Ingredient[];
  steps: CookingStepData[];
  dishes: Dish[];
  guests?: number;
  maxGuests?: number;
  portionNote?: string;
  cookingNote?: string;
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
        index < 0 ? "A place setting" : index === 0
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
      {index < 0 ? (
        <>
          <ellipse cx="122" cy="87" rx="70" ry="40" fill="none" stroke="#d9d1c5" />
          <path d="M27 50v28m7-28v28m7-28v28m-14-7q7 14 14 0m-7 12v42m174-75v75m0-75c-16 10-16 39 0 39" stroke="#948879" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : index === 0 ? (
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
  return <RecipePlannerSession key={JSON.stringify(props)} {...props} />;
}

function RecipePlannerSession(props: Partial<RecipePlannerProps> & { guestBinding?: NumberBinding }) {
  const baseGuests = clamp(Math.round(props.baseGuests ?? 6), 1, 100);
  const maxGuests = clamp(Math.max(props.maxGuests ?? 30, baseGuests, props.guests ?? 1), 1, 100);
  const [localGuests, setLocalGuests] = useState(clamp(Math.round(props.guests ?? baseGuests), 1, maxGuests));
  const guests = clamp(Math.round(props.guestBinding?.value ?? localGuests), 1, maxGuests);
  const setGuests = props.guestBinding?.setValue ?? setLocalGuests;
  const [checked, setChecked] = useState<number[]>([]);
  const [tab, setTab] = useState<"shopping" | "timeline">("shopping");
  const customMenu = props.ingredients !== undefined || props.dishes !== undefined || props.steps !== undefined;
  const ingredients = (props.ingredients ?? (customMenu ? [] : recipeSample.ingredients)).filter(Boolean).slice(0, 100);
  const steps = (props.steps ?? (customMenu ? [] : recipeSample.steps)).filter(Boolean).slice(0, 60);
  const dishes = (props.dishes ?? (customMenu ? [] : recipeSample.dishes)).filter(Boolean).slice(0, 12);
  const title = props.title || (customMenu ? "Your meal plan" : recipeSample.title);
  const quantity = (ingredient: Ingredient) => {
    const scaled = scaleIngredient(ingredient, guests, baseGuests);
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(scaled)}${ingredient.unit ? ` ${ingredient.unit}` : ""}`;
  };
  const shoppingText = `${title} — ${guests} people\n${ingredients.map((ingredient) => `${quantity(ingredient)} ${ingredient.name}`).join("\n")}`;
  return (
    <section
      className="iui iui-panel iui-tools iui-tools-recipe"
      aria-label="Recipe planner"
    >
      <header className="iui-tools-header">
        <h2 className="iui-heading">{title}</h2>
        <p className="iui-muted">
          {props.description ?? (customMenu ? "A menu and shopping list that adapt to your guest count." : recipeSample.description)}
        </p>
      </header>
      <div className="iui-tools-dishes">
        {dishes.map((dish, index) => (
          <article key={`${dish.name}-${index}`}>
            <DishImage dish={dish} index={customMenu && props.title !== recipeSample.title ? -1 : index} />
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
            onClick={() => setGuests(guests - 1)}
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
            disabled={guests >= maxGuests}
            onClick={() => setGuests(guests + 1)}
          >
            +
          </button>
        </div>
      </div>
      <div
        className="iui-tools-tablist"
        role="tablist"
        aria-label="Meal plan"
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
              {props.portionNote ?? `Quantities scaled from the recipe for ${baseGuests} people.`}
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
            {props.cookingNote ?? (dishes.some((dish) => /lamb/i.test(dish.name || ""))
              ? "Timing is a guide; adjust for your joint and oven. Cook whole cuts of lamb to 145°F / 63°C and rest at least 3 minutes."
              : "Timing is a guide; adjust for your ingredients and equipment. Check doneness before serving.")}
          </p>
        </div>
      )}
    </section>
  );
}

type GarmentKind = "shirt" | "tee" | "jacket" | "trousers" | "shoes" | "bag" | "dress" | "skirt" | "shorts" | "hat" | "accessory";
export type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  color: string;
  kind: GarmentKind;
  imageUrl?: string;
};
export type Outfit = { name: string; occasion: string; itemIds: string[] };
export type WardrobePlannerProps = {
  title: string;
  description: string;
  items: WardrobeItem[];
  outfits: Outfit[];
  weatherOptions?: string[];
  tripLengthOptions?: number[];
  defaultWeather?: string;
  defaultTripDays?: number;
  packingRules?: PackingRuleData[];
};
const wardrobeSample: WardrobePlannerProps = {
  title: "Your capsule wardrobe",
  description:
    "A considered everyday wardrobe. Neutral tones, easy layers, and pieces that work together.",
  weatherOptions: ["Cool", "Mild", "Warm"],
  tripLengthOptions: [3, 5, 7],
  defaultWeather: "Mild",
  defaultTripDays: 5,
  packingRules: [
    { weather: "*", includeItemIds: ["bag"], excludeItemIds: [], note: "" },
    { weather: "Cool", includeItemIds: ["jacket"], excludeItemIds: [], note: "An extra layer is included." },
    { weather: "Warm", includeItemIds: [], excludeItemIds: ["jacket"], note: "Keep it light; the jacket stays home." },
    { weather: "Mild", includeItemIds: [], excludeItemIds: [], note: "Easy layers for changing temperatures." },
  ],
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
        {item.kind === "dress" ? (
          <><path d="m87 27 13-5h20l13 5 12 45-17 8 36 89H56l36-89-17-8Z" /><path d="M91 80h38m-29-55q10 18 20 0" fill="none" /></>
        ) : item.kind === "skirt" ? (
          <><path d="M79 45h62l29 120H49Z" /><path d="M78 54h65m-42 1-10 105m31-105 10 105" fill="none" /></>
        ) : item.kind === "shorts" ? (
          <><path d="M75 40h70l10 104h-36l-10-52-10 52H62Z" /><path d="M76 51h68M109 42v50" fill="none" /></>
        ) : item.kind === "hat" ? (
          <><path d="M64 110V81a46 40 0 0 1 92 0v29Z" /><ellipse cx="110" cy="112" rx="83" ry="19" /><path d="M68 101h86" fill="none" /></>
        ) : item.kind === "accessory" ? (
          <><rect x="74" y="49" width="73" height="110" rx="17" /><path d="M89 64h43m-43 79h43" fill="none" /></>
        ) : item.kind === "trousers" ? (
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
  return <WardrobePlannerSession key={JSON.stringify(props)} {...props} />;
}

function WardrobePlannerSession(props: Partial<WardrobePlannerProps>) {
  const id = useId();
  const customWardrobe = props.items !== undefined;
  const items = (props.items ?? wardrobeSample.items).filter(
    (item) => item?.id && item?.name,
  ).filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 60);
  const outfits = (props.outfits ?? (customWardrobe ? [] : wardrobeSample.outfits)).filter(Boolean).slice(0, 30).map((look) => ({ ...look, itemIds: [...new Set(look.itemIds ?? [])].filter((itemId) => items.some((item) => item.id === itemId)) }));
  const weatherOptions = props.weatherOptions?.length ? [...new Set(props.weatherOptions)].slice(0, 8) : wardrobeSample.weatherOptions!;
  const tripLengthOptions = props.tripLengthOptions?.length ? [...new Set(props.tripLengthOptions.map((days) => clamp(Math.round(days), 1, 90)))].slice(0, 8) : wardrobeSample.tripLengthOptions!;
  const packingRules = props.packingRules ?? (customWardrobe ? [] : wardrobeSample.packingRules!);
  const [category, setCategory] = useState("All pieces");
  const [outfit, setOutfit] = useState<number | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [packed, setPacked] = useState<string[]>([]);
  const [weather, setWeather] = useState(weatherOptions.includes(props.defaultWeather ?? "Mild") ? props.defaultWeather ?? "Mild" : weatherOptions[0]);
  const [tripDays, setTripDays] = useState(tripLengthOptions.includes(props.defaultTripDays ?? 5) ? props.defaultTripDays ?? 5 : tripLengthOptions[0]);
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
          {props.description ?? (customWardrobe ? "Explore your pieces, combine outfits and build a packing list." : wardrobeSample.description)}
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
            const packing = buildPackingList(items.map((item) => item.id), look?.itemIds || items.map((item) => item.id), packingRules, weather);
            setPackingIds(packing.ids);
            setSaved(packing.ids);
            setPackingNote(
              `${tripDays} ${tripDays === 1 ? "day" : "days"} · ${weather.toLowerCase()} · ${occasion.toLowerCase()}. ${packing.note}`,
            );
          }}
        >
          {[
            {
              name: "days",
              label: "How long?",
              options: tripLengthOptions.map((days) => `${days} ${days === 1 ? "day" : "days"}`),
              value: `${tripDays} ${tripDays === 1 ? "day" : "days"}`,
              set: (value: string) => setTripDays(parseInt(value, 10)),
            },
            {
              name: "weather",
              label: "What is the weather like?",
              options: weatherOptions,
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

// Child records are real OpenUI components, so the model can assemble and reuse
// data references across tools instead of embedding opaque JSON payloads.
export const BillLineItem = defineComponent({
  name: "BillLineItem",
  description: "An expense for BillSplitter. amount is in the selected currency's main unit. people contains zero-based indexes into the splitter's people array; assign at least one person when splitting by item.",
  props: z.object({ name: z.string().max(120), amount: z.number().min(0).max(100000), people: z.array(z.number().int().min(0).max(11)).max(12) }),
  component: ({ props }) => <div className="iui-tools-row"><span>{props.name}</span><span>{props.amount}</span></div>,
});

export const RecipeIngredient = defineComponent({
  name: "RecipeIngredient",
  description: "An ingredient measured for RecipePlanner's baseGuests. scaling: proportional preserves fractions, whole rounds up whole items, fixed keeps quantity unchanged. Empty unit defaults to whole-item rounding; set proportional for fractions such as half an egg.",
  props: z.object({ name: z.string().min(1).max(120), quantity: z.number().min(0).max(100000), unit: z.string().max(24), scaling: z.enum(["proportional", "whole", "fixed"]).optional() }),
  component: ({ props }) => <div className="iui-tools-row"><span>{props.name}</span><span>{props.quantity} {props.unit}</span></div>,
});

export const RecipeStep = defineComponent({
  name: "RecipeStep",
  description: "A cooking checklist step. time is a relative or clock label such as '20 minutes before serving' or '6:30 PM'; title and description explain the action.",
  props: z.object({ time: z.string().max(60), title: z.string().min(1).max(120), description: z.string().max(800) }),
  component: ({ props }) => <div><span className="iui-tools-caption">{props.time}</span><h3>{props.title}</h3><p>{props.description}</p></div>,
});

export const MenuDish = defineComponent({
  name: "MenuDish",
  description: "A dish card for RecipePlanner. imageUrl must be a real provided image URL or empty for a neutral illustrated plate. Do not invent images or reuse roast photos for unrelated recipes.",
  props: z.object({ name: z.string().min(1).max(120), description: z.string().max(400), imageUrl: z.string().max(2000) }),
  component: ({ props }) => <article><DishImage dish={props} index={-1} /><h3>{props.name}</h3><p className="iui-tools-caption">{props.description}</p></article>,
});

export const WardrobePiece = defineComponent({
  name: "WardrobePiece",
  description: "A garment or accessory. id is unique in its wardrobe; category is a free-form filter. kind selects a silhouette, and a real imageUrl can represent any item beyond those silhouettes. color is a hex color.",
  props: z.object({ id: z.string().min(1).max(60), name: z.string().min(1).max(120), category: z.string().min(1).max(60), color: z.string().regex(/^#(?:[a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/), kind: z.enum(["shirt", "tee", "jacket", "trousers", "shoes", "bag", "dress", "skirt", "shorts", "hat", "accessory"]), imageUrl: z.string().max(2000).optional() }),
  component: ({ props }) => <article className="iui-tools-wardrobe-piece"><WardrobeImage item={props} /><h3>{props.name}</h3><p className="iui-tools-caption">{props.category}</p></article>,
});

export const WardrobeOutfit = defineComponent({
  name: "WardrobeOutfit",
  description: "A named combination of WardrobePiece ids for any occasion. itemIds must match items in the same WardrobePlanner; categories, occasions and item counts are unrestricted within the bounds.",
  props: z.object({ name: z.string().min(1).max(120), occasion: z.string().min(1).max(60), itemIds: z.array(z.string().min(1).max(60)).min(1).max(30) }),
  component: ({ props }) => <div><h3>{props.name}</h3><p className="iui-tools-caption">{props.occasion} · {props.itemIds.length} pieces</p></div>,
});

export const PackingRule = defineComponent({
  name: "PackingRule",
  description: "A declarative wardrobe packing rule. weather matches one of the planner's weatherOptions, or '*' applies always. Include or exclude existing item ids. Rules run in order; exclusions win within a rule. note explains the adjustment.",
  props: z.object({ weather: z.string().min(1).max(60), includeItemIds: z.array(z.string().max(60)).max(60), excludeItemIds: z.array(z.string().max(60)).max(60), note: z.string().max(400) }),
  component: ({ props }) => props.note ? <p className="iui-tools-caption">{props.note}</p> : null,
});

export const BillSplitter = defineComponent({
  name: "BillSplitter",
  description: "Compose editable bills, trips or shared expenses from BillLineItem refs and named people. Currency-aware exact splitting, per-item or equal allocation, editable tax/tip and copyable shares. taxPercent and tipPercent accept $state bindings so controls can share state with the response. Optional labels adapt the copy to the expense type.",
  props: z.object({
    title: z.string().min(1).max(160),
    currency: z.string().regex(/^[A-Z]{3}$/),
    people: z.array(z.string().min(1).max(40)).min(1).max(12),
    items: z.array(BillLineItem.ref).max(100),
    taxPercent: reactive(z.number().min(0).max(100)),
    tipPercent: reactive(z.number().min(0).max(100)),
    description: z.string().max(500).optional(),
    splitMethod: z.enum(["items", "equal"]).optional(),
    tipBasis: z.enum(["subtotal", "after-tax"]).optional(),
    peopleLabel: z.string().max(120).optional(),
    itemsLabel: z.string().max(120).optional(),
    subtotalLabel: z.string().max(60).optional(),
  }),
  component: function BillSplitterRenderer({ props }) {
    const id = useId();
    const tax = useStateField(`${id}-tax`, props.taxPercent);
    const tip = useStateField(`${id}-tip`, props.tipPercent);
    const configKey = toolConfigurationKey(props, [...(tax.isReactive ? ["taxPercent"] : []), ...(tip.isReactive ? ["tipPercent"] : [])]);
    return <BillSplitterSession key={configKey} {...props} items={readToolRecords<BillItem>(props.items)} taxPercent={tax.value} tipPercent={tip.value} taxBinding={tax.isReactive ? tax : undefined} tipBinding={tip.isReactive ? tip : undefined} />;
  },
});

export const SavingsCalculator = defineComponent({
  name: "SavingsCalculator",
  description: "A configurable projection for any savings goal, currency, balance, monthly deposit and horizon. Numeric inputs accept $state bindings. Calculates monthly compounding with optional start/end-of-month deposits and an annual contribution increase. Includes zero and negative return scenarios; hypothetical projections are not guaranteed.",
  props: z.object({
    title: z.string().min(1).max(160),
    currency: z.string().regex(/^[A-Z]{3}$/),
    initialSavings: reactive(z.number().min(0).max(100000000)),
    monthlyContribution: reactive(z.number().min(0).max(1000000)),
    years: reactive(z.number().int().min(1).max(80)),
    annualReturn: reactive(z.number().min(-20).max(30)),
    description: z.string().max(500).optional(),
    contributionTiming: z.enum(["start", "end"]).optional(),
    annualContributionGrowth: z.number().min(0).max(25).optional(),
  }),
  component: function SavingsCalculatorRenderer({ props }) {
    const id = useId();
    const initial = useStateField(`${id}-initial`, props.initialSavings);
    const monthly = useStateField(`${id}-monthly`, props.monthlyContribution);
    const years = useStateField(`${id}-years`, props.years);
    const rate = useStateField(`${id}-rate`, props.annualReturn);
    const configKey = toolConfigurationKey(props, [...(initial.isReactive ? ["initialSavings"] : []), ...(monthly.isReactive ? ["monthlyContribution"] : []), ...(years.isReactive ? ["years"] : []), ...(rate.isReactive ? ["annualReturn"] : [])]);
    return <SavingsCalculatorSession key={configKey} {...props} initialSavings={initial.value} monthlyContribution={monthly.value} years={years.value} annualReturn={rate.value} bindings={{ initial: initial.isReactive ? initial : undefined, monthly: monthly.isReactive ? monthly : undefined, years: years.isReactive ? years : undefined, rate: rate.isReactive ? rate : undefined }} />;
  },
});

export const RecipePlanner = defineComponent({
  name: "RecipePlanner",
  description: "Compose any meal or menu from RecipeIngredient, RecipeStep and MenuDish refs. Quantities are measured for baseGuests and scale to an editable guest count. guests accepts a $state binding for linked controls. Optional notes explain portion and timing assumptions. Never substitute default roast ingredients for a custom meal.",
  props: z.object({
    title: z.string().min(1).max(160),
    description: z.string().max(600),
    baseGuests: z.number().int().min(1).max(100),
    ingredients: z.array(RecipeIngredient.ref).max(100),
    steps: z.array(RecipeStep.ref).max(60),
    dishes: z.array(MenuDish.ref).max(12),
    guests: reactive(z.number().int().min(1).max(100).optional()),
    maxGuests: z.number().int().min(1).max(100).optional(),
    portionNote: z.string().max(400).optional(),
    cookingNote: z.string().max(600).optional(),
  }),
  component: function RecipePlannerRenderer({ props }) {
    const id = useId();
    const guests = useStateField(`${id}-guests`, props.guests ?? props.baseGuests);
    const configKey = toolConfigurationKey(props, guests.isReactive ? ["guests"] : []);
    return <RecipePlannerSession key={configKey} {...props} ingredients={readToolRecords<Ingredient>(props.ingredients)} steps={readToolRecords<CookingStepData>(props.steps)} dishes={readToolRecords<Dish>(props.dishes)} guests={guests.value} guestBinding={guests.isReactive ? { value: guests.value ?? props.baseGuests, setValue: guests.setValue } : undefined} />;
  },
});

export const WardrobePlanner = defineComponent({
  name: "WardrobePlanner",
  description: "Compose wardrobes from WardrobePiece and WardrobeOutfit refs. Category filters, favorites, outfit combinations and packing work for arbitrary supplied items. Optional weatherOptions, tripLengthOptions and PackingRule refs customize personalization; no clothing types or weather decisions are assumed for a custom wardrobe. Never invent prices or purchase links.",
  props: z.object({
    title: z.string().min(1).max(160),
    description: z.string().max(600),
    items: z.array(WardrobePiece.ref).min(1).max(60),
    outfits: z.array(WardrobeOutfit.ref).max(30),
    weatherOptions: z.array(z.string().min(1).max(60)).min(1).max(8).optional(),
    tripLengthOptions: z.array(z.number().int().min(1).max(90)).min(1).max(8).optional(),
    defaultWeather: z.string().max(60).optional(),
    defaultTripDays: z.number().int().min(1).max(90).optional(),
    packingRules: z.array(PackingRule.ref).max(30).optional(),
  }),
  component: ({ props }) => <WardrobePlannerView {...props} items={readToolRecords<WardrobeItem>(props.items)} outfits={readToolRecords<Outfit>(props.outfits)} packingRules={props.packingRules ? readToolRecords<PackingRuleData>(props.packingRules) : undefined} />,
});

export const toolComponents = {
  BillLineItem, BillSplitter, SavingsCalculator, RecipeIngredient, RecipeStep, MenuDish,
  RecipePlanner, WardrobePiece, WardrobeOutfit, PackingRule, WardrobePlanner,
};
