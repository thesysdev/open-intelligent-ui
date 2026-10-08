import assert from "node:assert/strict";
import { fitExplodedBounds } from "../src/lib/intelligent/diagram-bounds";

assert.deepEqual(fitExplodedBounds([0, 0, 100, 100], []), [0, 0, 100, 100]);
assert.deepEqual(fitExplodedBounds([0, 0, 100, 100], [{ x: 10, y: 10, width: 80, height: 80, offset: [50, -30] }]), [0, -20, 140, 120]);
assert.deepEqual(fitExplodedBounds([-50, -50, 500, 500], [{ x: 10, y: 10, width: 80, height: 80, offset: [50, -30] }]), [-50, -50, 500, 500]);
assert.deepEqual(fitExplodedBounds([0, 0, 100, 100], [{ x: 0, y: 0, width: 20, height: 20, offset: [-40, 130], padding: 5 }]), [-45, -5, 145, 160]);
assert.deepEqual(fitExplodedBounds([0, 0, 100, 100], [{ x: Infinity, y: 0, width: 20, height: 20, offset: [0, 0] }]), [0, 0, 100, 100]);

const parts = [{ x: 240, y: 10, width: 180, height: 70, offset: [0, -110] as [number, number], padding: 6 }, { x: 250, y: 315, width: 160, height: 20, offset: [0, 130] as [number, number], padding: 6 }];
const frame = fitExplodedBounds([0, 0, 640, 360], parts);
assert.deepEqual(frame, [0, -106, 640, 577]);
for (const part of parts) for (const spread of [0, .25, .5, .75, 1]) {
  assert.ok(part.x + part.offset[0] * spread - part.padding >= frame[0]);
  assert.ok(part.y + part.offset[1] * spread - part.padding >= frame[1]);
  assert.ok(part.x + part.width + part.offset[0] * spread + part.padding <= frame[0] + frame[2]);
  assert.ok(part.y + part.height + part.offset[1] * spread + part.padding <= frame[1] + frame[3]);
}
console.log("PASS automatic diagram framing preserves supplied bounds and contains the full exploded sweep");
