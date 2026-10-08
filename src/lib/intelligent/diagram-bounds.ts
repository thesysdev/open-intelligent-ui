export type DiagramViewBox = [number, number, number, number];
export type SweptPartBounds = { x: number; y: number; width: number; height: number; offset: [number, number]; padding?: number };

/** Preserve the requested frame and fit both ends of every linear part movement. */
export function fitExplodedBounds(viewBox: DiagramViewBox, parts: SweptPartBounds[]): DiagramViewBox {
  let left = viewBox[0], top = viewBox[1], right = left + viewBox[2], bottom = top + viewBox[3];
  for (const part of parts) {
    const { x, y, width, height, offset } = part;
    if (![x, y, width, height, ...offset].every(Number.isFinite) || width < 0 || height < 0) continue;
    const padding = Number.isFinite(part.padding) ? Math.max(0, part.padding!) : 0;
    left = Math.min(left, x + Math.min(0, offset[0]) - padding);
    top = Math.min(top, y + Math.min(0, offset[1]) - padding);
    right = Math.max(right, x + width + Math.max(0, offset[0]) + padding);
    bottom = Math.max(bottom, y + height + Math.max(0, offset[1]) + padding);
  }
  return [left, top, right - left, bottom - top];
}
