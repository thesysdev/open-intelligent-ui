import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Chart } from "./chart";

const layout = vi.hoisted(() => ({ hoveredRow: null as number | null }));

// Server rendering has no layout measurement. Supply a measured width while
// keeping React's real state hooks and all of the chart's rendering logic. The
// tooltip tests also seed the Cartesian chart's hovered-row state.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState: (initial: unknown) => react.useState(initial === 0 ? 640 : initial === null ? layout.hoveredRow : initial),
  };
});

afterEach(() => {
  layout.hoveredRow = null;
});

type ChartProps = Parameters<typeof Chart.component>[0]["props"];
const types = ["bar", "line", "area", "pie", "donut", "scatter"] as const;
const nonFiniteStrings = ["Infinity", "-Infinity", "1e309", "-1e309"];

function render(props: ChartProps) {
  expect(Chart.props.safeParse(props).success).toBe(true);
  return renderToStaticMarkup(createElement(Chart.component, { props, renderNode: () => null }));
}

function propsFor(type: ChartProps["type"], value: string | number): ChartProps {
  return {
    type,
    data: [{ category: "A", x: 1, value }, { category: "B", x: 2, value: 10 }],
    x: type === "scatter" ? "x" : "category",
    series: ["value"],
  };
}

describe.each(types)("Chart %s values", (type) => {
  it.each(nonFiniteStrings)("normalizes %s to the existing zero fallback", (value) => {
    const markup = render(propsFor(type, value));
    expect(markup).toContain("<svg");
    expect(markup).not.toMatch(/NaN|Infinity/);
    expect(markup).toBe(render(propsFor(type, 0)));
  });

  it.each(["12.5", "-12.5", "0", "1e2", "  4  "])("preserves finite numeric string %s", (value) => {
    const markup = render(propsFor(type, value));
    expect(markup).not.toMatch(/NaN|Infinity/);
    expect(markup).toBe(render(propsFor(type, Number(value))));
  });

  it.each(["not a number", "", "   "])("preserves the zero fallback for %j", (value) => {
    expect(render(propsFor(type, value))).toBe(render(propsFor(type, 0)));
  });

  it("preserves the zero fallback for a missing series value", () => {
    const props = propsFor(type, 0);
    delete props.data[0].value;
    expect(render(props)).toBe(render(propsFor(type, 0)));
  });
});

describe("Chart non-finite coordinates and stacks", () => {
  it.each(nonFiniteStrings)("normalizes scatter x value %s", (value) => {
    const props = propsFor("scatter", 5);
    props.data[0].x = value;
    const markup = render(props);
    expect(markup).not.toMatch(/NaN|Infinity/);
    props.data[0].x = 0;
    expect(markup).toBe(render(props));
  });

  it.each(["bar", "area"] as const)("keeps stacked %s geometry finite", (type) => {
    const props = { ...propsFor(type, "Infinity"), stacked: true, series: ["value", "other"] };
    props.data[0].other = 5;
    props.data[1].other = 3;
    const markup = render(props);
    expect(markup).toContain("<svg");
    expect(markup).not.toMatch(/NaN|Infinity/);
    props.data[0].value = 0;
    expect(markup).toBe(render(props));
  });
});

describe("Chart signed-zero tooltip compatibility", () => {
  it("normalizes a string negative zero to positive zero", () => {
    layout.hoveredRow = 0;
    const markup = render(propsFor("bar", "-0"));
    expect(markup).toContain('class="iui-chart-tooltip"');
    expect(markup).toContain("<b>0</b>");
    expect(markup).toBe(render(propsFor("bar", 0)));
  });

  it("preserves a numeric negative zero", () => {
    layout.hoveredRow = 0;
    const markup = render(propsFor("bar", -0));
    expect(markup).toContain('class="iui-chart-tooltip"');
    expect(markup).toContain("<b>-0</b>");
  });
});
