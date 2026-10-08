import { creativeCompositionComponents } from "./creative-composition";
import { sceneComponents, type SceneData, type VectorShape } from "./scene";

const path = (d: string, fill: string, stroke = "#617896", strokeWidth = 1.5): VectorShape => ({ kind: "path", d, fill, stroke, strokeWidth });
const paper = (shapes: VectorShape[]): SceneData => ({ viewBox: [0, 0, 500, 285], shapes });

export const paperPlaneSteps = [
  { id: "crease", title: "Find the center", body: "Fold a rectangular sheet in half lengthwise, then unfold. The long center crease is your guide.", tip: "Keep the edges aligned before pressing the crease.", illustration: paper([path("M165 28H335V255H165Z", "#edf2f8"), path("M250 28V255", "none", "#8ea1b8")]) },
  { id: "corners", title: "Fold in the top corners", body: "Bring both top corners toward the center crease. Their edges should meet without overlapping.", tip: "A symmetrical point helps the plane fly straight.", illustration: paper([path("M165 113 250 28 335 113V255H165Z", "#dfe9f5"), path("M165 113 250 28V113Z", "#bccfe7"), path("M335 113 250 28V113Z", "#ccdbed"), path("M250 28V255", "none", "#8ea1b8")]) },
  { id: "narrow", title: "Make a narrow nose", body: "Fold both new diagonal edges inward until they meet the center crease. Press the folds firmly.", tip: "Keep the nose sharp and the lower edges even.", illustration: paper([path("M180 255 250 28 320 255Z", "#dfe9f5"), path("M180 255 250 28V255Z", "#bfd2e9"), path("M250 28V255", "none", "#8ea1b8")]) },
  { id: "wings", title: "Fold and open the wings", body: "Fold the plane in half along the center. Fold each side down to make a wing, then open the wings slightly.", tip: "Try a gentle, level throw. Adjust both wings by the same amount.", illustration: paper([path("M92 205 399 64 277 229 244 168Z", "#c4d7ed"), path("M92 205 399 64 244 168Z", "#e6eef8"), path("M244 168 277 229 260 187Z", "#8caed4"), path("M120 225 93 238M145 235 118 248", "none", "#bbc4cf")]) },
];

export const kettleScene: SceneData = {
  viewBox: [0, 0, 760, 430], shapes: [
    { kind: "rect", x: 0, y: 0, width: 760, height: 430, fill: "#efeee9" },
    { kind: "rect", x: 0, y: 316, width: 760, height: 114, fill: "#dbd6ca" },
    { kind: "ellipse", x: 383, y: 352, width: 165, height: 17, fill: "#c1baab", opacity: .45 },
    path("M444 132C558 110 556 283 460 277", "none", "#333735", 23),
    { ...path("M290 170C262 242 268 316 316 335H429C477 318 485 241 457 170Z", "#7b9b8f", "#648678", 2), region: "body" },
    path("M293 192 229 159 263 235 279 253", "#adb7ad", "#909c91", 2),
    { kind: "ellipse", x: 374, y: 170, width: 84, height: 15, fill: "#8da394", stroke: "#647b6d" },
    { kind: "ellipse", x: 374, y: 165, width: 72, height: 12, fill: "#babeb1", region: "lid", stroke: "#879184" },
    { kind: "rect", x: 353, y: 137, width: 42, height: 22, r: 9, fill: "#333735" },
    { kind: "ellipse", x: 374, y: 337, width: 91, height: 13, fill: "#373d39" },
    path("M304 204C292 244 296 285 313 306", "none", "#ffffff", 9),
    { kind: "circle", x: 419, y: 300, r: 4, fill: "#e9f0d7" },
  ],
};

const stoolDrawing = (phase: number, expanded: boolean): SceneData => {
  const offset = expanded ? 28 : 0;
  return { viewBox: [0, 0, 640, 365], shapes: [
    { kind: "ellipse", x: 320, y: 324, width: 141, height: 14, fill: "#e9e7e1" },
    path(`M232 ${153 + offset} 212 ${314 + offset}H235L262 ${155 + offset}Z`, "#b78e59", "#967345"),
    path(`M378 ${155 + offset} 405 ${314 + offset}H428L408 ${153 + offset}Z`, "#c59d65", "#967345"),
    path(`M283 ${166 + offset} 291 ${299 + offset}H311L310 ${167 + offset}Z`, "#a97e4c", "#967345"),
    path(`M337 ${166 + offset} 329 ${299 + offset}H349L364 ${166 + offset}Z`, "#ae844e", "#967345"),
    ...(phase > 0 ? [path(`M235 ${243 + offset} 405 ${243 + offset}V256H233Z`, "#bf975f", "#967345")] : []),
    { kind: "ellipse", x: 320, y: 150 - offset, width: 122, height: 35, fill: "#b78e59", stroke: "#967345", strokeWidth: 1.5 },
    { kind: "ellipse", x: 320, y: 139 - offset, width: 122, height: 35, fill: "#dbc297", stroke: "#967345", strokeWidth: 1.5 },
    ...(phase === 2 ? [{ kind: "path" as const, d: "M485 118 498 131 522 103", fill: "none", stroke: "#638b78", strokeWidth: 4 }] : []),
  ] };
};

export const stoolAssemblySteps = [
  { title: "Match the seat and legs", body: "Place the seat upside down on a soft surface. Match each leg with its marked mounting point.", find: "Find · Seat, four legs and supplied fixings", check: "Parts matched to their mounting points", illustration: stoolDrawing(0, false), explodedIllustration: stoolDrawing(0, true) },
  { title: "Fit the stretchers", body: "Fit the horizontal supports between the legs. Start the fasteners loosely so everything can align.", find: "Find · Horizontal supports and fasteners", check: "Supports fitted evenly", illustration: stoolDrawing(1, false), explodedIllustration: stoolDrawing(1, true) },
  { title: "Tighten and check", body: "Follow the supplied manual to tighten the fixings. Stand the stool on a level floor and check for movement before use.", find: "Check · Alignment, fixings and stability", check: "Final stability check complete", illustration: stoolDrawing(2, false), explodedIllustration: stoolDrawing(2, true) },
];

type Node = { component: keyof typeof registry; props: Record<string, unknown> };
const registry = { ...creativeCompositionComponents, ...sceneComponents };
const node = (component: Node["component"], props: Record<string, unknown>): Node => ({ component, props });
const sceneNode = (scene: SceneData) => node("SceneDrawing", { viewBox: scene.viewBox, shapes: scene.shapes.map(shape => node("SceneShape", shape)) });
const stepNode = (step: Record<string, unknown>) => node("GuideStep", { ...step, illustration: step.illustration ? sceneNode(step.illustration as SceneData) : undefined, explodedIllustration: step.explodedIllustration ? sceneNode(step.explodedIllustration as SceneData) : undefined });
const encode = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(encode).join(",")}]`;
  if (value && typeof value === "object" && "component" in value && "props" in value) {
    const item = value as Node;
    const keys = Object.keys(registry[item.component].props.shape);
    let last = keys.length - 1;
    while (last >= 0 && item.props[keys[last]] === undefined) last--;
    return `${item.component}(${keys.slice(0, last + 1).map(key => encode(item.props[key])).join(",")})`;
  }
  return JSON.stringify(value ?? null);
};

const variantNodes = [
  { id: "kettle-finishes", title: "Try a different finish", description: "One scene, two independent color regions.", node: node("RecolorableScene", { title: "Make this kettle yours", description: "Choose a finish for the body and lid.", scene: sceneNode(kettleScene), regions: [node("ColorRegion", { id: "body", label: "Body", originalColor: "#7b9b8f" }), node("ColorRegion", { id: "lid", label: "Lid", originalColor: "#babeb1" })], palette: [{ name: "Sage", hex: "#7b9b8f" }, { name: "Dusk", hex: "#8795b0" }, { name: "Terracotta", hex: "#bd8470" }, { name: "Cream", hex: "#ded3bc" }, { name: "Slate", hex: "#68777e" }, { name: "Rose", hex: "#c99c9b" }].map(swatch => node("ColorSwatch", swatch)), colors: { body: "#7b9b8f", lid: "#babeb1" }, footnote: "Concept illustration. Select Body or Lid to change that finish independently." }) },
  { id: "paper-plane", title: "Fold something new", description: "Four original steps using the same illustrated guide.", node: node("IllustratedStepGuide", { title: "Fold a classic paper plane", description: "A rectangular sheet, four folds, and a little flight.", level: "Beginner", steps: paperPlaneSteps.map(stepNode), repeatLabel: "Fold another ↻" }) },
  { id: "studio-layout", title: "Plan a shared studio", description: "A 3 × 5 grid with editable uses for each space.", node: node("EditableGrid", { title: "Make room for your studio", description: "Select any space to change its purpose.", optionLabel: "use", options: [
    { id: "desk", name: "Work desk", short: "Work", color: "#dae4ee", ink: "#405c76", icon: "W", note: "Focused work", tip: "Keep a clear path behind each workstation." },
    { id: "meet", name: "Meeting", short: "Meet", color: "#e9ddc5", ink: "#7f6031", icon: "M", note: "Shared ideas", tip: "Keep discussion areas together to protect quiet work." },
    { id: "store", name: "Storage", short: "Store", color: "#ddd7e7", ink: "#6d5984", icon: "S", note: "Tools + materials", tip: "Place frequently used supplies close to the work area." },
    { id: "clear", name: "Open space", short: "Open", color: "#e9eae5", ink: "#657063", icon: "·", note: "Room to move", tip: "Leave clear circulation and access to doors." },
  ].map(option => node("GridOption", option)), layouts: [node("GridLayout", { id: "studio", label: "Shared studio", rows: 3, columns: 5, cells: ["desk", "desk", "clear", "meet", "meet", "desk", "desk", "clear", "meet", "meet", "store", "store", "clear", "clear", "clear"], cellLabel: "Space", summary: "3 rows × 5 spaces" })], footer: "Concept plan · check real dimensions before arranging", footnote: "Tap a space to edit it. Reset returns to this suggested layout." }) },
  { id: "stool-assembly", title: "Assemble another object", description: "Three steps and exploded illustrations without bicycle assumptions.", node: node("AssemblyGuide", { title: "Put your stool together", description: "Three steps, one steady seat.", steps: stoolAssemblySteps.map(stepNode), footnote: "Illustrative guide. Follow the supplied manual for your stool’s assembly details." }) },
];

/** Actual OpenUI responses, rendered by the same parser and registry as live chat. */
export const creativeVariants = variantNodes.map(({ node: item, ...meta }) => ({ ...meta, response: `root = Card([${encode(item)}])` }));
