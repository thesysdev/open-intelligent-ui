"use client";

import { defineComponent, reactive, useIsStreaming, useStateField } from "@openuidev/react-lang";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod/v4";
import { RangeInput } from "./controls";
import { SceneShape, VectorShapes, drawingShapes, recordProps, vectorShapeSchema, viewBoxSchema } from "./scene";
import { fitExplodedBounds, type DiagramViewBox, type SweptPartBounds } from "./diagram-bounds";

export const diagramPartSchema = z.object({
  id: z.string().max(80), label: z.string().max(100),
  group: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  shapes: z.array(vectorShapeSchema).max(200),
  offset: z.tuple([z.number(), z.number()]).describe("Translation [x,y] at full explosion; zero when assembled."),
  pivot: z.tuple([z.number(), z.number()]).optional(),
  rotates: z.boolean().optional(),
});
export type DiagramPartData = z.infer<typeof diagramPartSchema>;
export type DiagramData = { title: string; parts: DiagramPartData[]; viewBox?: [number, number, number, number]; description?: string; motionLabel?: string };

export function DiagramCanvas({ parts, viewBox = [0, 0, 640, 360], explode = 0, selected = "All", rotation = 0, label }: DiagramData & { explode?: number; selected?: string; rotation?: number; label?: string }) {
  const id = `diagram-${useId().replace(/:/g, "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const spread = Math.pow(Math.max(0, Math.min(100, explode)) / 100, .72);
  const bounds=viewBoxSchema.safeParse(viewBox);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const requested = viewBoxSchema.safeParse(viewBox);
    const minimum: DiagramViewBox = requested.success ? requested.data : [0, 0, 640, 360];
    const byId = new Map(parts.map(part => [part.id, part]));
    const measured: SweptPartBounds[] = [];
    for (const group of svg.querySelectorAll<SVGGElement>("[data-diagram-part]")) {
      const part = byId.get(group.getAttribute("data-diagram-part") ?? "");
      if (!part?.shapes.length) continue;
      try {
        // getBBox excludes this group's explosion translation but includes the
        // inner rotation. Measure real paths instead of guessing their extents.
        const box = group.getBBox();
        const stroke = Math.max(0, ...part.shapes.map(shape => shape.stroke && shape.stroke !== "none" ? shape.strokeWidth ?? 1 : 0));
        measured.push({ x: box.x, y: box.y, width: box.width, height: box.height, offset: part.offset ?? [0, 0], padding: stroke / 2 + 4 });
      } catch {
        // Incomplete streamed groups can briefly be unmeasurable. The next
        // completed geometry render measures them before paint.
      }
    }
    // Frame the entire motion once, so a slider drag never zooms the drawing.
    svg.setAttribute("viewBox", fitExplodedBounds(minimum, measured).join(" "));
  }, [parts, viewBox, rotation]);
  return <svg ref={svgRef} viewBox={(bounds.success?bounds.data:[0,0,640,360]).join(" ")} role="img" aria-label={label ?? `${selected === "All" ? "All parts" : selected} highlighted; ${explode}% exploded`}>
    <defs><linearGradient id={id}><stop stopColor="#bec8bf"/><stop offset=".5" stopColor="#e0e6da"/><stop offset="1" stopColor="#a5b2a6"/></linearGradient></defs>
    {parts.map(part => <g key={part.id} data-diagram-part={part.id} opacity={selected === "All" || selected === part.id || selected === (part.group ?? part.label) ? 1 : .13} transform={`translate(${(part.offset?.[0] ?? 0) * spread} ${(part.offset?.[1] ?? 0) * spread})`}>
      <g transform={part.rotates ? `rotate(${rotation} ${part.pivot?.[0] ?? 0} ${part.pivot?.[1] ?? 0})` : undefined}><VectorShapes shapes={part.shapes} metalId={id}/></g>
    </g>)}
  </svg>;
}

export function ExplodedDiagramView({ title, parts, viewBox, description = "Select a part to explore how it fits together.", motionLabel = "Animate parts", showControls = true, showHeading=true, explode: boundExplode, selected: boundSelected, initialExplode=0,initialSelected="All", onExplode, onSelect, disabled = false }: DiagramData & {showControls?: boolean;showHeading?:boolean;explode?: number;selected?: string;initialExplode?:number;initialSelected?:string;onExplode?:(value:number)=>void;onSelect?:(value:string)=>void;disabled?:boolean}) {
  const [localExplode, setExplode] = useState(initialExplode), [localSelected, setSelected] = useState(initialSelected);
  const [rotation, setRotation] = useState(0), [expanded, setExpanded] = useState(false);
  const explode = Number.isFinite(boundExplode) ? boundExplode! : localExplode;
  const candidate = boundSelected ?? localSelected;
  const selected = candidate==="All"||parts.some(part=>part.id===candidate||(part.group||part.label)===candidate) ? candidate : "All";
  const groups = Array.from(new Set(parts.map(p => p.group || p.label)));
  const highlighted = parts.filter(p => selected === p.id || selected === (p.group || p.label));
  const explanation = Array.from(new Set(highlighted.map(p => p.description).filter(Boolean))).join(" ");
  return <section className={`iui-panel iui-bike ${expanded ? "iui-expanded" : ""}`} aria-label={title}>
    {showHeading&&<div className="iui-panel-heading"><h2>{title}</h2><button className="iui-icon-button" aria-label={`${expanded ? "Collapse" : "Expand"} diagram`} onClick={() => setExpanded(!expanded)}>{expanded ? "↙" : "↗"}</button></div>}
    <div className="iui-bike-canvas"><DiagramCanvas title={title} parts={parts} viewBox={viewBox} explode={explode} selected={selected} rotation={rotation}/></div>
    {showControls && <><label className="iui-slider-label iui-bike-assembly">Explore the assembly<strong>{explode ? `${explode}% exploded` : "Assembled"}</strong><RangeInput aria-label="Explode parts" aria-valuetext={`${explode}% exploded`} min={0} max={100} value={explode} disabled={disabled} onChange={e => {setExplode(+e.target.value);onExplode?.(+e.target.value);}}/></label>
      <div className="iui-segments" aria-label="Object systems">{["All", ...groups].map(group => <button key={group} disabled={disabled} aria-pressed={selected === group} onClick={() => {setSelected(group);onSelect?.(group);}}>{group}</button>)}</div></>}
    <div className="iui-bike-caption"><div><h3>{selected === "All" ? "How it fits together" : highlighted.length ? selected : "Explore the parts"}</h3><p>{explanation || description}</p></div>{parts.some(p => p.rotates) && <button className="iui-button" disabled={disabled} onClick={() => setRotation(r => r + 90)}>{motionLabel} <span>↻</span></button>}</div>
  </section>;
}

export const DiagramPart = defineComponent({ name: "DiagramPart", props: diagramPartSchema.extend({shapes: z.array(SceneShape.ref).max(200)}), description: "One independently movable part of any object. Supply vector shapes, group, explanation, and explode offset. Wheels/rotors can have rotates=true and a pivot. Parts are data, never hardcoded to an object type.", component: () => null });
export const explodedDiagramSchema = z.object({
  title: z.string(), parts: z.array(DiagramPart.ref).max(40),
  viewBox: viewBoxSchema.clone().optional(), description: z.string().optional(),
  motionLabel: z.string().optional(), showControls: z.boolean().optional(),
  explode: reactive(z.number().min(0).max(100).optional()),
  selected: reactive(z.string().optional()),
  showHeading:z.boolean().optional().describe("Set false inside an InteractivePanel that already supplies the heading."),
});
export function diagramParts(items: unknown): DiagramPartData[] {
  if(!Array.isArray(items))return [];
  return items.slice(0,40).flatMap(item=>{
    const part=recordProps(item);
    if(!part||typeof part!=="object")return [];
    const fields=Object.fromEntries(Object.entries(part).filter(([,value])=>value!=null));
    const parsed=diagramPartSchema.safeParse({...fields,shapes:drawingShapes(fields.shapes).slice(0,200)});
    return parsed.success?[parsed.data]:[];
  }).filter((part,index,parts)=>parts.findIndex(other=>other.id===part.id)===index);
}
export const ExplodedDiagram = defineComponent({name: "ExplodedDiagram", props: explodedDiagramSchema, description: "Exploded view of ANY object: bicycle, unicycle, camera, engine, plant, etc. Compose DiagramPart and SceneShape records. viewBox is the minimum frame; the renderer automatically includes assembled and exploded geometry. explode and selected can bind to shared $state; set showControls=false to compose external RangeControl/ChoiceControl.", component: function ExplodedDiagramRenderer({props}) {
  const id = useId();
  const explode = useStateField(`${id}-explode`, props.explode), selected = useStateField(`${id}-selected`, props.selected);
  const disabled = useIsStreaming();
  return <ExplodedDiagramView title={props.title??"Explore the parts"} parts={diagramParts(props.parts)} viewBox={props.viewBox??undefined} description={props.description??undefined} motionLabel={props.motionLabel??undefined} showControls={props.showControls??true} showHeading={props.showHeading??true} initialExplode={explode.value??0} initialSelected={selected.value??"All"} explode={explode.isReactive?explode.value:undefined} selected={selected.isReactive?selected.value:undefined} onExplode={explode.isReactive?explode.setValue:undefined} onSelect={selected.isReactive?selected.setValue:undefined} disabled={disabled}/>;
}});
export const diagramComponents = {DiagramPart, ExplodedDiagram};
