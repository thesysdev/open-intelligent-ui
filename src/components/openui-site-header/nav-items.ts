import type { ComponentType, SVGProps } from "react";
import {
  Book,
  ChartPieSlice,
  Code,
  CreditCard,
  DeviceMobileCamera,
  Monitor,
  PlugsConnected,
  PresentationChart,
  Users,
} from "./icons";

// Mirror of PRIMARY_SITE_NAV_ITEMS in thesysdev/openui docs/components/site-primary-nav.tsx.
// Links are absolute because this app is also served from its own vercel.app domain.
const SITE = "https://www.openui.com";

export type NavChild = {
  title: string;
  href: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tag?: string;
};

export type NavGroup = { label: string; children: NavChild[] };

export const NAV_LINKS = [
  { title: "Demos", href: `${SITE}/demos` },
  { title: "Documentation", href: `${SITE}/docs` },
];

export const RESOURCES_TITLE = "Resources";

export const RESOURCES: NavGroup[] = [
  {
    label: "Demos",
    children: [
      {
        title: "Open Intelligent UI",
        description: "Interactive maps, images, and editable itineraries built with OpenUI.",
        href: `${SITE}/demo/intelligent-ui`,
        icon: Monitor,
      },
      {
        title: "F1 Dashboard",
        description: "Explore races, drivers, and teams with live standings and interactive charts.",
        href: `${SITE}/demo/f1-dashboard`,
        icon: ChartPieSlice,
      },
      {
        title: "Trip Planner",
        description: "Plan a trip with visual itineraries, maps, and live hotel prices.",
        href: `${SITE}/demo/trip-planner/planner`,
        icon: DeviceMobileCamera,
      },
      {
        title: "AI Dashboards",
        description: "A demo built on GitHub data that answers with a dashboard",
        href: `${SITE}/demo/github`,
        icon: ChartPieSlice,
      },
    ],
  },
  {
    label: "Lab projects",
    children: [
      {
        title: "AppLess",
        description: "An open-source concept for an OS without any apps",
        href: `${SITE}/appless`,
        icon: DeviceMobileCamera,
        tag: "New",
      },
      {
        title: "OUI-1",
        description: "An open-weight model built to generate interfaces with OpenUI Lang.",
        href: `${SITE}/oui-1`,
        icon: Code,
        tag: "New",
      },
      {
        title: "OpenClaw OS",
        description: "A power-packed workspace for your OpenClaw agents",
        href: `${SITE}/openclaw-os`,
        icon: Monitor,
      },
      {
        title: "By community",
        description: "Tools, packages, plugins, and demos from the community",
        href: `${SITE}/lab`,
        icon: Users,
      },
    ],
  },
  {
    label: "Other",
    children: [
      {
        title: "Benchmarks",
        description: "Compare how Generative UI frameworks perform across models",
        href: `${SITE}/benchmarks`,
        icon: PresentationChart,
      },
      {
        title: "Pricing",
        description: "OpenUI, Gateway, and Observability pricing",
        href: `${SITE}/pricing`,
        icon: CreditCard,
      },
      {
        title: "Blogs",
        description: "Product updates, deep dives, and notes on building generative UI from our team.",
        href: `${SITE}/blog`,
        icon: Book,
      },
      {
        title: "Integrations",
        description: "How OpenUI integrates easily with your AI frameworks, UI libraries, SDKs etc.",
        href: `${SITE}/integrations`,
        icon: PlugsConnected,
      },
    ],
  },
];

export const HOME_HREF = `${SITE}/`;
export const DOCS_HREF = `${SITE}/docs`;
export const GITHUB_HREF = "https://github.com/thesysdev/openui";
