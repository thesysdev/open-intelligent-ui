import { createLibrary } from "@openuidev/react-lang";
import { actions } from "../actions";
import { functions } from "../functions";
import { baseComponentGroups, baseComponents } from "../library";
import "./learn.css";
import { KpiCard, StatusBadge } from "./components";
import { learnFunctions } from "./functions";

/** The chat library plus a small "company design system" for the /learn tutorial. */
export const learnLibrary = createLibrary({
  root: "Col",
  components: [...baseComponents, KpiCard, StatusBadge],
  functions: [...functions, ...learnFunctions],
  actions,
  componentGroups: [
    ...baseComponentGroups,
    {
      name: "Metrics",
      components: ["KpiCard", "StatusBadge"],
      notes: [
        '- KpiCard shows one metric: a label, a big value and its delta. Format money with format "currency" and currency "EUR" etc.; percent values are like 3.4, not 0.034. Derive delta from the data (value - previous) rather than typing it.',
        "- StatusBadge is a short pill for a status or health-check result; tone picks the color. Never use it for actions.",
      ],
    },
  ],
});

// The data tool is separate from the library: the prompt lists its spec, and
// the Renderer's toolProvider runs it. Not part of createLibrary.
export { learnToolProvider, learnToolSpecs } from "./tools";
