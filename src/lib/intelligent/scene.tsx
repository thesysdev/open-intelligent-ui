"use client";

import { defineComponent } from "@openuidev/react-lang";
import { useId } from "react";
import { z } from "zod/v4";

/** A bounded drawing vocabulary. No markup, handlers, external URLs or code. */
export const vectorShapeSchema = z.object({
  kind: z.enum(["path", "circle", "ellipse", "rect", "line", "text"]),
  d: z.string().max(12000).optional(),
  x: z.number().min(-10000).max(10000).optional(),
  y: z.number().min(-10000).max(10000).optional(),
  width: z.number().min(0).max(10000).optional(),
  height: z.number().min(0).max(10000).optional(),
  r: z.number().min(0).max(10000).optional(),
  x2: z.number().min(-10000).max(10000).optional(),
  y2: z.number().min(-10000).max(10000).optional(),
  fill: z.string().max(80).optional().describe("Hex color, none, or metal. No URLs."),
  stroke: z.string().max(80).optional(),
  strokeWidth: z.number().min(0).max(100).optional(),
  opacity: z.number().min(0).max(1).optional(),
  text: z.string().max(200).optional(),
  region: z.string().max(80).optional().describe("Optional identifier of a recolorable region."),
});
export type VectorShape = z.infer<typeof vectorShapeSchema>;
export const viewBoxSchema = z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]);
export const sceneSchema = z.object({ viewBox: viewBoxSchema, shapes: z.array(vectorShapeSchema).max(500) });
export type SceneData = z.infer<typeof sceneSchema>;

/** Child records arrive as ElementNodes from OpenUI and as plain data in presets. */
export function recordProps<T>(value: T | { props: T }): T {
  return value && typeof value === "object" && "props" in value ? (value as { props: T }).props : value as T;
}
export function drawingShapes(value: unknown): VectorShape[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 500).flatMap(item => {
    const record = recordProps(item);
    // Positional OpenUI calls use null placeholders for omitted optional props.
    const fields = record && typeof record === "object" ? Object.fromEntries(Object.entries(record).filter(([, field]) => field != null)) : record;
    const parsed = vectorShapeSchema.safeParse(fields);
    return parsed.success ? [parsed.data] : [];
  });
}
export function drawingData(value: unknown): SceneData {
  const data = recordProps(value) as Partial<SceneData> | undefined;
  const viewBox = viewBoxSchema.safeParse(data?.viewBox);
  return { viewBox: viewBox.success ? viewBox.data : [0, 0, 640, 360], shapes: drawingShapes(data?.shapes) };
}

export function safePaint(value: string | undefined, fallback = "none") {
  return value && /^(#[a-f\d]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i.test(value) ? value : fallback;
}

export function VectorShapes({ shapes, regionColors = {}, metalId }: { shapes: VectorShape[]; regionColors?: Record<string, string>; metalId?: string }) {
  return <>{drawingShapes(shapes).map((shape, index) => {
    const fill = regionColors[shape.region ?? ""] ?? shape.fill;
    const common = { fill: fill === "metal" && metalId ? `url(#${metalId})` : safePaint(fill), stroke: shape.stroke === "metal" && metalId ? `url(#${metalId})` : safePaint(shape.stroke), strokeWidth: shape.strokeWidth ?? 1, opacity: shape.opacity ?? 1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    const x = shape.x ?? 0, y = shape.y ?? 0;
    switch (shape.kind) {
      case "path": return <path key={index} {...common} d={shape.d?.slice(0, 12000)} />;
      case "circle": return <circle key={index} {...common} cx={x} cy={y} r={shape.r ?? 10} />;
      case "ellipse": return <ellipse key={index} {...common} cx={x} cy={y} rx={shape.width ?? 10} ry={shape.height ?? 10} />;
      case "rect": return <rect key={index} {...common} x={x} y={y} width={shape.width ?? 10} height={shape.height ?? 10} rx={shape.r ?? 0} />;
      case "line": return <line key={index} {...common} x1={x} y1={y} x2={shape.x2 ?? x} y2={shape.y2 ?? y} />;
      case "text": return <text key={index} {...common} x={x} y={y} textAnchor="middle" fontSize={shape.height ?? 14}>{shape.text}</text>;
    }
  })}</>;
}

export function VectorScene({ scene, regionColors, label = "Illustration" }: { scene: SceneData; regionColors?: Record<string, string>; label?: string }) {
  const metalId = `metal-${useId().replace(/:/g, "")}`;
  const viewBox = viewBoxSchema.safeParse(scene?.viewBox);
  return <svg viewBox={(viewBox.success ? viewBox.data : [0, 0, 640, 360]).join(" ")} role="img" aria-label={label}>
    <defs><linearGradient id={metalId}><stop stopColor="#bec8bf"/><stop offset=".5" stopColor="#e0e6da"/><stop offset="1" stopColor="#a5b2a6"/></linearGradient></defs>
    <VectorShapes shapes={scene?.shapes} regionColors={regionColors} metalId={metalId}/>
  </svg>;
}

export const SceneShape = defineComponent({ name: "SceneShape", props: vectorShapeSchema.clone(), description: "A safe vector shape used inside SceneDrawing or DiagramPart. Geometry is in scene coordinates. For paths use d; circles use x/y/r; ellipses use x/y/width/height as radii. Text uses text and height as font size.", component: () => null });
export const SceneDrawing = defineComponent({ name: "SceneDrawing", props: z.object({ viewBox: viewBoxSchema.clone(), shapes: z.array(SceneShape.ref).max(500) }), description: "A vector drawing composed of SceneShape records. Supply [minX,minY,width,height] and shapes. No SVG markup or JavaScript.", component: ({ props }) => <VectorScene scene={drawingData(props)}/> });
export const sceneComponents = { SceneShape, SceneDrawing };
