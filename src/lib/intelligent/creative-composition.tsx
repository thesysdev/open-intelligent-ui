"use client";

import { defineComponent, reactive, useIsStreaming, useStateField } from "@openuidev/react-lang";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { z } from "zod/v4";
import { SceneDrawing, VectorScene, type SceneData } from "./scene";
import "./creative.css";

type NodeProps<T> = T | { props: T };
const data = <T,>(value: NodeProps<T>): T => (value && typeof value === "object" && "props" in value ? value.props : value) ?? {} as T;
const drawing = (value?: unknown): SceneData | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const scene = data(value as NodeProps<SceneData>);
  if (!Array.isArray(scene.viewBox) || !Array.isArray(scene.shapes)) return undefined;
  return { ...scene, shapes: scene.shapes.map(shape => data(shape)) };
};
const color = (value: string | undefined, fallback: string) => /^#[0-9a-f]{3,8}$/i.test(value ?? "") ? value! : fallback;

export type SwatchData = { name: string; hex: string };
export type RegionData = { id: string; label: string; originalColor: string };
type RecolorableSceneProps = {
  title: string; description?: string; palette: SwatchData[]; regions: RegionData[]; scene?: SceneData;
  footnote?: string; originalLabel?: string; renderScene?: (colors: Record<string, string>) => ReactNode;
  selectedRegion?: string; onRegion?: (region: string) => void; colors?: Record<string, string>; onColors?: (colors: Record<string, string>) => void; disabled?: boolean;
};

export function RecolorableSceneView({ title = "Color preview", description, palette = [], regions = [], scene, footnote, originalLabel = "Original colors", renderScene, selectedRegion, onRegion, colors: boundColors, onColors, disabled = false }: RecolorableSceneProps) {
  const swatches = palette.slice(0, 18);
  const editable = regions.slice(0, 12);
  const [regionId, setRegionId] = useState(editable[0]?.id ?? "");
  const currentRegion = editable.find(region => region.id === (selectedRegion ?? regionId)) ?? editable[0];
  const [localSelections, setSelections] = useState<Record<string, string>>({});
  const selections = boundColors ?? localSelections;
  const [original, setOriginal] = useState(false);
  const selectedHex = selections[currentRegion?.id] ?? swatches[0]?.hex;
  const selected = swatches.find(swatch => swatch.hex === selectedHex);
  const colors = Object.fromEntries(editable.map(region => [region.id, color(original ? region.originalColor : selections[region.id] ?? swatches[0]?.hex, region.originalColor)]));
  const sceneLabel = `${title}; ${original ? originalLabel : `${currentRegion?.label ?? "Color"}: ${selected?.name ?? "Custom"}`}`;
  return <section className="iui-panel iui-creative iui-room">
    <div className="iui-panel-heading"><div><h2>{title}</h2>{description && <p className="iui-muted">{description}</p>}</div></div>
    <div className="iui-room-scene">{renderScene ? renderScene(colors) : scene ? <VectorScene scene={scene} regionColors={colors} label={sceneLabel}/> : <div className="iui-scene-empty">Add an illustration to preview colors.</div>}</div>
    {editable.length > 1 && <div className="iui-region-picker" aria-label="Choose a region">{editable.map(region => <button key={region.id} className="iui-button" disabled={disabled} aria-pressed={region.id === currentRegion?.id} onClick={() => { setRegionId(region.id); onRegion?.(region.id); }}>{region.label}</button>)}</div>}
    <div className="iui-room-toolbar"><div className="iui-segments"><button aria-pressed={!original} onClick={() => setOriginal(false)}>Your color</button><button aria-pressed={original} onClick={() => setOriginal(true)}>Original</button></div><span className="iui-muted" aria-live="polite">{original ? originalLabel : selected?.name}</span></div>
    <div className="iui-paint-swatches" aria-label={`${currentRegion?.label ?? "Scene"} colors`}>{swatches.map(swatch => <button key={`${swatch.name}-${swatch.hex}`} className="iui-paint-swatch" aria-pressed={selectedHex === swatch.hex && !original} aria-label={`${swatch.name}, ${swatch.hex}`} disabled={!currentRegion || disabled} onClick={() => { const next = { ...selections, [currentRegion.id]: swatch.hex }; setSelections(next); onColors?.(next); setOriginal(false); }}><span style={{ background: color(swatch.hex, "#e8e5dc") }}/><span><strong>{swatch.name}</strong><small>{swatch.hex}</small>{selectedHex === swatch.hex && !original && <b aria-hidden="true">✓</b>}</span></button>)}</div>
    {footnote && <p className="iui-creative-footnote">{footnote}</p>}
  </section>;
}

export type GuideStepData = { id?: string; title: string; body: string; tip?: string; illustration?: SceneData; explodedIllustration?: SceneData; find?: string; check?: string; part?: number };
type GuideProps = { title: string; description?: string; level?: string; steps: GuideStepData[]; repeatLabel?: string; renderIllustration?: (step: number) => ReactNode; activeStep?: number; onStep?: (step: number) => void; disabled?: boolean };

export function IllustratedStepGuideView({ title = "Step-by-step guide", description, level, steps = [], repeatLabel = "Start again ↻", renderIllustration, activeStep, onStep, disabled = false }: GuideProps) {
  const [step, setLocalStep] = useState(0);
  const setStep = (value: number) => { setLocalStep(value); onStep?.(value); };
  const index = Math.max(0, Math.min(Math.floor(Number.isFinite(activeStep) ? activeStep! : step), Math.max(0, steps.length - 1)));
  const current = steps[index];
  if (!current) return <section className="iui-panel iui-creative"><h2>{title}</h2><p className="iui-muted">Steps will appear here.</p></section>;
  return <section className="iui-panel iui-creative iui-origami"><div className="iui-panel-heading"><div><h2>{title}</h2>{description && <p className="iui-muted">{description}</p>}</div></div><div className="iui-fold-card">
    <div className="iui-fold-meta"><span>Step {index + 1} of {steps.length}</span>{level && <span>{level}</span>}</div>
    <div className="iui-fold-progress" aria-label={`Step ${index + 1} of ${steps.length}`}>{steps.map((item, i) => <button key={item.id ?? i} disabled={disabled} className={i <= index ? "is-complete" : ""} aria-label={`Go to step ${i + 1}: ${item.title}`} aria-current={i === index ? "step" : undefined} onClick={() => setStep(i)}/>)}</div>
    {(renderIllustration || current.illustration) && <div className="iui-fold-canvas">{renderIllustration ? renderIllustration(index) : <VectorScene scene={current.illustration!} label={`Step ${index + 1}: ${current.title}`}/>}</div>}
    <div className="iui-fold-instruction" aria-live="polite"><h3>{current.title}</h3><p>{current.body}</p></div>{current.tip && <div className="iui-fold-tip">{current.tip}</div>}
    </div><div className="iui-fold-nav"><button disabled={index === 0 || disabled} onClick={() => setStep(index - 1)}>← Previous step</button><button disabled={disabled} onClick={() => setStep(index === steps.length - 1 ? 0 : index + 1)}>{index === steps.length - 1 ? repeatLabel : "Next step →"}</button></div>
  </section>;
}

export type GridOptionData = { id: string; name: string; short?: string; note?: string; color: string; ink?: string; textColor?: string; icon?: string; tip?: string; illustration?: SceneData };
export type GridLayoutData = { id: string; label: string; rows: number; columns: number; cells: string[]; cellLabel?: string; summary?: string };
type GridProps = { title: string; description?: string; options: GridOptionData[]; layouts: GridLayoutData[]; footnote?: string; footer?: string; resetLabel?: string; optionLabel?: string; renderIcon?: (option: GridOptionData) => ReactNode; selectedLayout?: string; onLayout?: (id: string) => void; assignments?: Record<string, string[]>; onAssignments?: (assignments: Record<string, string[]>) => void; disabled?: boolean };

export function normalizeGridLayout(layout: GridLayoutData, options: GridOptionData[]): GridLayoutData {
  const rows = Math.max(1, Math.min(12, Math.round(Number.isFinite(layout.rows) ? layout.rows : 1)));
  const columns = Math.max(1, Math.min(12, Math.round(Number.isFinite(layout.columns) ? layout.columns : 1)));
  const ids = new Set(options.map(option => option.id));
  const cells = layout.cells ?? [];
  return { ...layout, rows, columns, cells: Array.from({ length: rows * columns }, (_, index) => ids.has(cells[index]) ? cells[index] : options[0]?.id ?? "") };
}

export function EditableGridView({ title = "Editable layout", description, options = [], layouts = [], footnote, footer, resetLabel = "Reset plan ↻", optionLabel = "option", renderIcon, selectedLayout, onLayout, assignments, onAssignments, disabled = false }: GridProps) {
  const [layoutId, setLayoutId] = useState(layouts[0]?.id ?? "");
  const source = layouts.find(layout => layout.id === (selectedLayout ?? layoutId)) ?? layouts[0];
  const layout = source ? normalizeGridLayout(source, options) : undefined;
  const [edits, setEdits] = useState<Record<string, Record<number, string>>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const selectedIndex = selected !== null && layout && selected < layout.cells.length ? selected : null;
  const cellOption = (index: number) => options.find(option => option.id === ((assignments ?? edits)[layout?.id ?? ""]?.[index] ?? layout?.cells[index])) ?? options[0];
  const icon = (option: GridOptionData) => renderIcon ? renderIcon(option) : option.illustration ? <VectorScene scene={option.illustration} label={option.name}/> : <span className="iui-grid-initial" aria-hidden="true">{option.icon || option.short?.slice(0, 2) || option.name?.slice(0, 2)}</span>;
  const compact = (layout?.columns ?? 0) > 2;
  return <section className="iui-panel iui-creative iui-garden"><div className="iui-panel-heading"><div><h2>{title}</h2>{description && <p className="iui-muted">{description}</p>}</div></div>
    {layout && <><div className="iui-garden-toolbar">{layouts.length > 1 && <div className="iui-segments">{layouts.map(item => <button key={item.id} disabled={disabled} aria-pressed={layout.id === item.id} onClick={() => { setLayoutId(item.id); onLayout?.(item.id); setSelected(null); }}>{item.label}</button>)}</div>}{layout.summary && <span className="iui-muted">{layout.summary}</span>}</div>
    <div className="iui-editable-grid-scroll"><div className={`iui-garden-grid ${compact ? "iui-garden-sixteen" : ""}`} style={{ gridTemplateColumns: `repeat(${layout.columns},minmax(0,1fr))`, "--iui-grid-columns": layout.columns } as CSSProperties} aria-label={`Editable ${title.toLowerCase()}`}>{layout.cells.map((_, index) => {
      const option = cellOption(index);
      return <button key={index} disabled={disabled} style={{ background: color(option?.color, "#f3f3f3"), color: color(option?.ink, "#38453a"), "--iui-grid-label": color(option?.textColor, "#172315") } as CSSProperties} aria-pressed={selectedIndex === index} aria-label={`${layout.cellLabel ?? "Cell"} ${index + 1}: ${option?.name ?? "Empty"}. Choose ${optionLabel === "option" ? "an" : "a"} ${optionLabel}.`} onClick={() => setSelected(index)}>{option && icon(option)}<strong>{compact ? option?.short ?? option?.name : option?.name ?? "Empty"}</strong>{!compact && option?.note && <small>{option.note}</small>}{selectedIndex === index && <span className="iui-garden-selected" aria-hidden="true">✓</span>}</button>;
    })}</div></div>
    {selectedIndex !== null ? <div className="iui-plant-editor"><div><h3>Choose {optionLabel === "option" ? "an" : "a"} {optionLabel} for {(layout.cellLabel ?? "cell").toLowerCase()} {selectedIndex + 1}</h3><button aria-label={`Close ${optionLabel} selector`} onClick={() => setSelected(null)}>×</button></div><div className="iui-plant-options">{options.map(option => <button key={option.id} disabled={disabled} aria-pressed={cellOption(selectedIndex)?.id === option.id} onClick={() => { const next = layout.cells.map((_, index) => index === selectedIndex ? option.id : cellOption(index)?.id ?? ""); setEdits(old => ({ ...old, [layout.id]: next })); onAssignments?.({ ...assignments, [layout.id]: next }); }}><span style={{ color: color(option.ink, "#38453a") }}>{icon(option)}</span>{option.name}</button>)}</div>{cellOption(selectedIndex)?.tip && <p aria-live="polite">{cellOption(selectedIndex).tip}</p>}</div> : footnote && <p className="iui-creative-footnote">{footnote}</p>}
    <div className="iui-garden-footer"><span>{footer}</span><button disabled={disabled} onClick={() => { setEdits({}); onAssignments?.({}); setSelected(null); }}>{resetLabel}</button></div></>}
    {!layout && <p className="iui-muted">Add a layout to begin.</p>}
  </section>;
}

type AssemblyProps = { title: string; description?: string; steps: GuideStepData[]; footnote?: string; renderIllustration?: (step: GuideStepData, exploded: boolean) => ReactNode; activeStep?: number; onStep?: (step: number) => void; disabled?: boolean };
export function AssemblyGuideView({ title = "Assembly guide", description = "Assembly guide", steps = [], footnote, renderIllustration, activeStep, onStep, disabled = false }: AssemblyProps) {
  const [step, setLocalStep] = useState(0);
  const setStep = (value: number) => { setLocalStep(value); onStep?.(value); };
  const [exploded, setExploded] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const index = Math.max(0, Math.min(Math.floor(Number.isFinite(activeStep) ? activeStep! : step), Math.max(0, steps.length - 1)));
  const current = steps[index];
  if (!current) return <section className="iui-panel iui-creative"><h2>{title}</h2><p className="iui-muted">Steps will appear here.</p></section>;
  const currentKey = current.id ?? String(index);
  const illustration = exploded ? current.explodedIllustration ?? current.illustration : current.illustration;
  const toggle = !!renderIllustration || steps.some(item => item.explodedIllustration);
  return <section className="iui-panel iui-creative iui-repair"><div className="iui-panel-heading"><div><h2>{title}</h2><p className="iui-muted">{description}</p></div>{toggle && <div className="iui-segments"><button aria-pressed={!exploded} onClick={() => setExploded(false)}>Assembled</button><button aria-pressed={exploded} onClick={() => setExploded(true)}>Exploded</button></div>}</div>
    {(renderIllustration || illustration) && <div className="iui-repair-diagram">{renderIllustration ? renderIllustration(current, exploded) : <VectorScene scene={illustration!} label={`${current.title}; ${exploded ? "exploded" : "assembled"} view`}/>}</div>}
    {footnote && <p className="iui-creative-footnote">{footnote}</p>}<div className="iui-repair-instruction" aria-live="polite"><span>Step {index + 1} of {steps.length}</span><h3>{current.title}</h3>{current.find && <p className="iui-muted">{current.find}</p>}<p>{current.body}</p></div>
    <label className="iui-repair-check"><input type="checkbox" disabled={disabled} checked={!!checked[currentKey]} onChange={event => setChecked(old => ({ ...old, [currentKey]: event.target.checked }))}/><span>{current.check ?? "Step complete"}</span></label>
    <div className="iui-repair-footer"><div aria-label={`${steps.filter((item, i) => checked[item.id ?? String(i)]).length} of ${steps.length} checks completed`}>{steps.map((item, i) => <button key={item.id ?? i} disabled={disabled} aria-label={`Step ${i + 1}: ${item.title}`} aria-current={index === i ? "step" : undefined} className={`${index === i ? "is-current" : ""} ${checked[item.id ?? String(i)] ? "is-checked" : ""}`} onClick={() => setStep(i)}/>)}</div><div><button className="iui-button" disabled={index === 0 || disabled} onClick={() => setStep(index - 1)}>Back</button><button className="iui-button iui-primary" disabled={disabled} onClick={() => setStep(index === steps.length - 1 ? 0 : index + 1)}>{index === steps.length - 1 ? "Review ↻" : "Next →"}</button></div></div>
  </section>;
}

export const ColorSwatch = defineComponent({ name: "ColorSwatch", props: z.object({ name: z.string(), hex: z.string().describe("CSS hex color such as #7998AB") }), description: "Named color for a RecolorableScene palette.", component: () => null });
export const ColorRegion = defineComponent({ name: "ColorRegion", props: z.object({ id: z.string(), label: z.string(), originalColor: z.string() }), description: "Editable region of a scene. Match id to SceneShape.region to recolor all matching shapes together.", component: () => null });
export const GuideStep = defineComponent({ name: "GuideStep", props: z.object({ title: z.string(), body: z.string(), tip: z.string().optional(), illustration: z.optional(SceneDrawing.ref), explodedIllustration: z.optional(SceneDrawing.ref), find: z.string().optional(), check: z.string().optional(), id: z.string().optional() }), description: "One instruction in an IllustratedStepGuide or AssemblyGuide. Supply original SceneDrawing illustrations for this step; never use unrelated preset artwork. explodedIllustration optionally supplies an expanded parts view. find lists parts needed; check labels completion.", component: () => null });
export const GridOption = defineComponent({ name: "GridOption", props: z.object({ id: z.string(), name: z.string(), color: z.string(), short: z.string().optional(), note: z.string().optional(), ink: z.string().optional(), icon: z.string().optional().describe("A short letter, symbol, or emoji; optional illustration gives a custom vector icon"), tip: z.string().optional(), illustration: z.optional(SceneDrawing.ref), textColor: z.string().optional().describe("Readable label color; defaults to near-black. Supply a light color for dark cell backgrounds.") }), description: "An assignable item in EditableGrid: a plant, seat type, room use, task or material. id is referenced by GridLayout.cells.", component: () => null });
export const GridLayout = defineComponent({ name: "GridLayout", props: z.object({ id: z.string(), label: z.string(), rows: z.number().int().min(1).max(12), columns: z.number().int().min(1).max(12), cells: z.array(z.string()).max(144), cellLabel: z.string().optional(), summary: z.string().optional() }), description: "A rectangular editable layout. cells contains option IDs in row-major order, one per cell. Multiple layouts preserve independent edits.", component: () => null });

export const recolorableSceneProps = z.object({ title: z.string(), scene: SceneDrawing.ref, palette: z.array(ColorSwatch.ref).min(1).max(18), regions: z.array(ColorRegion.ref).min(1).max(12), description: z.string().optional(), footnote: z.string().optional(), originalLabel: z.string().optional(), selectedRegion: reactive(z.string().optional()), colors: reactive(z.record(z.string(), z.string()).optional()) });
export const illustratedGuideProps = z.object({ title: z.string(), steps: z.array(GuideStep.ref).min(1).max(40), description: z.string().optional(), level: z.string().optional(), repeatLabel: z.string().optional(), activeStep: reactive(z.number().int().min(0).optional()) });
export const editableGridProps = z.object({ title: z.string(), options: z.array(GridOption.ref).min(1).max(36), layouts: z.array(GridLayout.ref).min(1).max(6), description: z.string().optional(), footnote: z.string().optional(), footer: z.string().optional(), optionLabel: z.string().optional(), resetLabel: z.string().optional(), selectedLayout: reactive(z.string().optional()), assignments: reactive(z.record(z.string(), z.array(z.string()).max(144)).optional()) });
export const assemblyGuideProps = z.object({ title: z.string(), steps: z.array(GuideStep.ref).min(1).max(40), description: z.string().optional(), footnote: z.string().optional(), activeStep: reactive(z.number().int().min(0).optional()) });
export const resolveGuideSteps = (steps: unknown[]): GuideStepData[] => (steps ?? []).filter(Boolean).slice(0, 40).map(item => {
  const step = data(item as NodeProps<GuideStepData>);
  return { ...step, illustration: drawing(step.illustration), explodedIllustration: drawing(step.explodedIllustration) };
});

export const RecolorableScene = defineComponent({ name: "RecolorableScene", props: recolorableSceneProps.clone(), description: "Recolor any original vector scene: rooms, furniture, clothing or product finishes. Compose SceneDrawing with region IDs, ColorRegion definitions and a ColorSwatch palette. Multiple regions recolor independently. colors and selectedRegion can bind to shared $variables.", component: function RecolorableSceneComponent({ props }) {
  const id = useId(), region = useStateField(`${id}-region`, props.selectedRegion), colors = useStateField(`${id}-colors`, props.colors), disabled = useIsStreaming();
  const [localRegion, setLocalRegion] = useState(region.value), [localColors, setLocalColors] = useState(colors.value);
  return <RecolorableSceneView {...props} scene={drawing(props.scene)} palette={(props.palette ?? []).filter(Boolean).map(item => data(item) as SwatchData)} regions={(props.regions ?? []).filter(Boolean).map(item => data(item) as RegionData)} selectedRegion={region.isReactive ? region.value : localRegion} colors={colors.isReactive ? colors.value : localColors} onRegion={region.isReactive ? region.setValue : setLocalRegion} onColors={colors.isReactive ? colors.setValue : setLocalColors} disabled={disabled}/>;
} });
export const IllustratedStepGuide = defineComponent({ name: "IllustratedStepGuide", props: illustratedGuideProps.clone(), description: "Arbitrary illustrated instructions for folding, crafts, cooking, drawing or learning. Every step has model-supplied text and optional safe vector illustration. Includes progress, tips and previous/next controls. activeStep is zero-based and may bind to shared $state for external navigation.", component: function IllustratedGuideComponent({ props }) {
  const id = useId(), step = useStateField(`${id}-step`, props.activeStep), disabled = useIsStreaming();
  const [localStep, setLocalStep] = useState(step.value);
  return <IllustratedStepGuideView {...props} steps={resolveGuideSteps(props.steps)} activeStep={step.isReactive ? step.value : localStep} onStep={step.isReactive ? step.setValue : setLocalStep} disabled={disabled}/>;
} });
export const EditableGrid = defineComponent({ name: "EditableGrid", props: editableGridProps.clone(), description: "Editable rectangular planning grid with model-supplied dimensions, layouts, assignable options, colors and notes. Use for gardens, seating, floor plans, task boards or storage. assignments can bind shared $state as a map of layout ID to row-major option IDs; selectedLayout also supports shared state.", component: function EditableGridComponent({ props }) {
  const id = useId(), layout = useStateField(`${id}-layout`, props.selectedLayout), assignments = useStateField(`${id}-assignments`, props.assignments), disabled = useIsStreaming();
  const [localLayout, setLocalLayout] = useState(layout.value), [localAssignments, setLocalAssignments] = useState(assignments.value);
  return <EditableGridView {...props} options={(props.options ?? []).filter(Boolean).slice(0, 36).map(item => { const option = data(item) as GridOptionData; return { ...option, illustration: drawing(option.illustration) }; })} layouts={(props.layouts ?? []).filter(Boolean).slice(0, 6).map(item => data(item) as GridLayoutData)} selectedLayout={layout.isReactive ? layout.value : localLayout} onLayout={layout.isReactive ? layout.setValue : setLocalLayout} assignments={assignments.isReactive ? assignments.value : localAssignments} onAssignments={assignments.isReactive ? assignments.setValue : setLocalAssignments} disabled={disabled}/>;
} });
export const AssemblyGuide = defineComponent({ name: "AssemblyGuide", props: assemblyGuideProps.clone(), description: "Step-by-step assembly or repair of any object. Supply GuideSteps with parts, instructions, completion checks, and original assembled/exploded SceneDrawing views. Any number of steps; activeStep may bind to shared $state.", component: function AssemblyGuideComponent({ props }) {
  const id = useId(), step = useStateField(`${id}-step`, props.activeStep), disabled = useIsStreaming();
  const [localStep, setLocalStep] = useState(step.value);
  return <AssemblyGuideView {...props} steps={resolveGuideSteps(props.steps)} activeStep={step.isReactive ? step.value : localStep} onStep={step.isReactive ? step.setValue : setLocalStep} disabled={disabled}/>;
} });

export const creativeCompositionComponents = { ColorSwatch, ColorRegion, GuideStep, GridOption, GridLayout, RecolorableScene, IllustratedStepGuide, EditableGrid, AssemblyGuide };
