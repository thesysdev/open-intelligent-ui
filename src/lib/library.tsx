import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { CardSourceProvider, Sources } from "@openuidev/react-ui";
import { z } from "zod/v4";
import { RouteMap, RouteStop, RouteStops, RouteSuggestions } from "./route/components";
import { RouteStoreProvider } from "./route/store";
import { learningComponents } from "./intelligent/learning";
import { toolComponents } from "./intelligent/tools";
import { creativeComponents } from "./intelligent/creative";
import { creativeCompositionComponents } from "./intelligent/creative-composition";
import { roadTripComponents } from "./intelligent/roadtrip";
import { sceneComponents } from "./intelligent/scene";
import { diagramComponents } from "./intelligent/diagram";
import { composableComponents } from "./intelligent/composable";

export const intelligentComponents = {
  ...learningComponents, ...toolComponents, ...roadTripComponents, ...creativeComponents,
  ...creativeCompositionComponents, ...sceneComponents, ...diagramComponents, ...composableComponents,
};
const baseCard = openuiChatLibrary.components.Card;
const baseChild = baseCard.props.shape.children.element;
const content = z.union([...baseChild.options, RouteMap.ref, RouteStops.ref, RouteSuggestions.ref,
  ...Object.values(intelligentComponents).map(component => component.ref)]);
export const InteractiveGroup = defineComponent({
  name: "InteractiveGroup",
  props: z.object({children:z.array(content),columns:z.enum(["one","two","three"]).optional()}),
  description:"Compose controls, results, charts, text and illustrations into a responsive group. Use two columns for paired controls or metrics. All reactive children can share $variables.",
  component:({props,renderNode})=><div className={`iui-composed-group iui-columns-${props.columns??"one"}`}>{renderNode(props.children)}</div>,
});
export const InteractivePanel = defineComponent({
  name:"InteractivePanel",
  props:z.object({title:z.string(),children:z.array(z.union([content,InteractiveGroup.ref])),description:z.string().optional(),badge:z.string().optional()}),
  description:"Polished panel for a custom interactive explanation or calculator. Compose independent RangeControl, ChoiceControl, ValueDisplay, ContributionChart, KnowledgeCheck and base library children. Connect them using shared $variables and built-in expressions. InteractiveGroup provides columns.",
  component:({props,renderNode})=><section className="iui-panel iui-composed-panel"><div className="iui-panel-heading"><div><h2>{props.title}</h2>{props.description&&<p className="iui-muted">{props.description}</p>}</div>{props.badge&&<span className="iui-tag">{props.badge}</span>}</div><div className="iui-composed-body">{renderNode(props.children)}</div></section>,
});
const IntelligentCard = defineComponent({
  name: "Card",
  props: z.object({children: z.array(z.union([
    ...baseChild.options, RouteMap.ref, RouteStops.ref, RouteSuggestions.ref,
    ...Object.values(intelligentComponents).map(component => component.ref),
    InteractivePanel.ref, InteractiveGroup.ref,
  ])), sources: baseCard.props.shape.sources}),
  description: "Root response container. Compose clear text, visualizations, interactive tools and everyday planning components. Avoid redundant headings when an interactive component already has a title.",
  component: ({props, renderNode}) => <RouteStoreProvider><CardSourceProvider sources={props.sources}><div className="rt-root">{renderNode(props.children)}<Sources /></div></CardSourceProvider></RouteStoreProvider>,
});

export const library = createLibrary({
  root: "Card",
  componentGroups: [
    ...(openuiChatLibrary.componentGroups ?? []),
    {
      name: "Travel",
      components: ["RouteMap", "RouteStops", "RouteSuggestions", "RouteStop"],
      notes: [
        "- For itineraries, day trips or sightseeing routes: CardHeader, then RouteMap([s1, s2, ...]), then RouteStops([s1, s2, ...]) using the same stop refs, then RouteSuggestions('Add to your day', [x1, x2]) with 2 extra stops not in the route, then an optional Callout with tips.",
      ],
    },
    {
      name: "Composable intelligent UI",
      components: [...Object.keys(sceneComponents), ...Object.keys(diagramComponents), ...Object.keys(composableComponents), ...Object.keys(creativeCompositionComponents), "InteractivePanel", "InteractiveGroup"],
      notes: [
        "Generate the data and compose components for the user's actual subject. Use ExplodedDiagram with arbitrary DiagramPart and SceneShape records for bicycles, unicycles, cameras or other objects; changing a title never changes geometry.",
        "SceneDrawing is bounded vector data, not raw SVG markup or code. Provide original geometry, labels, offsets and a viewBox that includes every part at full expansion.",
        "Bind reactive props to shared $variables. A RangeControl can drive ExplodedDiagram.explode, calculations and multiple outputs together. Prefer native expressions over hard-coded calculated results.",
        "RecolorableScene, IllustratedStepGuide, AssemblyGuide and EditableGrid accept new scenes, regions, steps and dimensions. Never reuse unrelated example artwork.",
      ],
    },
    {name:"Data-driven everyday tools",components:[...Object.keys(toolComponents),...Object.keys(roadTripComponents)],notes:[
      "Supply RecipeIngredient, RecipeStep and MenuDish records for any meal. Quantities relate to baseGuests. Supply new WardrobePiece, WardrobeOutfit and PackingRule records for a custom wardrobe.",
      "BillLineItem.people contains zero-based person indices. SavingsCalculator is hypothetical compound growth. RoadTripPlanner accepts arbitrary TripStop records, currency and cost assumptions.",
      "Omitted datasets select reference presets; always provide datasets for a different subject or location. Do not present invented budgets, scenarios or routes as verified live data.",
    ]},
    {name:"Reference presets and specialized simulations",components:[...Object.keys(learningComponents),...Object.keys(creativeComponents).filter(name=>!(name in creativeCompositionComponents))],notes:[
      "These are bounded reference experiences: seven-speed bicycle, fox origami, living room, garden, youth-bike assembly, GDP and drone market. For a different subject compose the generic components above.",
      "DistributionExplorer, MontyHall and RetroGame have purpose-built statistical/game mechanics. Do not imply they simulate arbitrary systems.",
    ]},
  ],
  components: Object.values({ ...openuiChatLibrary.components, Card: IntelligentCard, RouteMap, RouteStops, RouteSuggestions, RouteStop, ...intelligentComponents, InteractivePanel, InteractiveGroup }),
});
