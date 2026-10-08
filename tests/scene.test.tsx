import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { drawingData, drawingShapes, safePaint, VectorScene, type SceneData } from "../src/lib/intelligent/scene";

for (const value of [undefined, null, {}, { props: undefined }, { viewBox: [] }, { viewBox: [0, 0] }, { viewBox: [0, 0, 0, -5] }, { viewBox: "0 0 100 100", shapes: "pending" }]) {
  assert.deepEqual(drawingData(value), { viewBox: [0, 0, 640, 360], shapes: [] });
  assert.doesNotThrow(() => renderToStaticMarkup(createElement(VectorScene, { scene: value as unknown as SceneData })));
}
const scene = drawingData({ props: { viewBox: [-20, -10, 400, 240], shapes: [
  { type: "SceneShape", props: { kind: "circle", x: 30, y: 40, r: 12, fill: "#987abc" } },
  null, { props: undefined }, {}, { props: { kind: "script", text: "alert(1)" } },
  { props: { kind: "circle", x: Infinity } },
  { props: { kind: "path", d: "M0 0H10", onClick: "alert(1)", fill: "url(https://example.invalid/payload)" } },
] } });
assert.deepEqual(scene.viewBox, [-20, -10, 400, 240]);
assert.equal(scene.shapes.length, 2);
assert.equal("onClick" in scene.shapes[1], false);
const html = renderToStaticMarkup(createElement(VectorScene, { scene }));
assert.ok(html.includes('viewBox="-20 -10 400 240"'));
assert.ok(html.includes('cx="30"'));
assert.ok(!html.includes("alert(1)"));
assert.ok(!html.includes("example.invalid"));
assert.equal(safePaint("url(https://example.invalid/image)"), "none");
assert.equal(drawingShapes(Array.from({ length: 600 }, () => ({ kind: "circle" }))).length, 500);
assert.deepEqual(drawingShapes({ length: 500 }), []);
console.log("PASS scene normalization: partial streaming, refs, malformed geometry, rendering bounds and safe attributes");
