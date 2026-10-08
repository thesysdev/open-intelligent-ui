import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createLibrary, createParser, defineComponent, Renderer } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { creativeComponents } from "../src/lib/intelligent/creative";
import { normalizeGridLayout } from "../src/lib/intelligent/creative-composition";
import { creativeVariants } from "../src/lib/intelligent/creative-variants";
import { sceneComponents } from "../src/lib/intelligent/scene";

const components = { ...creativeComponents, ...sceneComponents };
const Card = defineComponent({ name: "Card", props: z.object({ children: z.array(z.union(Object.values(components).map(item => item.ref))) }), description: "Test container", component: ({ props, renderNode }) => <div>{renderNode(props.children)}</div> });
const library = createLibrary({ root: "Card", components: [Card, ...Object.values(components)] });
const parser = createParser(library.toJSONSchema());
const render = (response: string) => {
  const parsed = parser.parse(response);
  assert.deepEqual(parsed.meta.errors ?? [], []);
  assert.ok(parsed.root);
  return renderToString(createElement(Renderer, { library, response })).replace(/<!--.*?-->/g, "");
};

for (const variant of creativeVariants) {
  const html = render(variant.response);
  assert.ok(html.includes("iui-"));
  if (variant.id === "paper-plane") {
    assert.ok(html.includes("Step 1 of 4"));
    assert.ok(html.includes("Find the center"));
    assert.ok(!html.includes("fox"));
    const bound = `$active = 2\n${variant.response.replace(/\)\]\)$/, ",$active)])")}`;
    assert.ok(render(bound).includes("Make a narrow nose"));
  }
  if (variant.id === "studio-layout") {
    assert.equal((html.match(/Choose a use/g) ?? []).length, 15);
    assert.ok(html.includes("3 rows × 5 spaces"));
    assert.ok(!html.includes("Lettuce"));
  }
  if (variant.id === "stool-assembly") {
    assert.ok(html.includes("Step 1 of 3"));
    assert.ok(!html.includes("bicycle"));
  }
  if (variant.id === "kettle-finishes") {
    assert.ok(html.includes("Body"));
    assert.ok(html.includes("Lid"));
    assert.ok(html.includes('fill="#7b9b8f"'));
    assert.ok(html.includes('fill="#babeb1"'));
  }
  console.log(`PASS ${variant.id}: parsed and rendered through OpenUI`);
  for (let length = 24; length < variant.response.length; length += Math.ceil(variant.response.length / 24)) {
    assert.doesNotThrow(() => renderToString(createElement(Renderer, { library, response: variant.response.slice(0, length), isStreaming: true })), `Streaming ${variant.id} at ${length} characters`);
  }
}

const options = [{ id: "a", name: "A", color: "#ffffff" }, { id: "b", name: "B", color: "#ffffff" }];
assert.deepEqual(normalizeGridLayout({ id: "x", label: "Custom", rows: 2, columns: 3, cells: ["b", "invalid"] }, options).cells, ["b", "a", "a", "a", "a", "a"]);
assert.equal(normalizeGridLayout({ id: "x", label: "Bounded", rows: 200, columns: Infinity, cells: [] }, options).cells.length, 12);

for (const component of ["RoomColorPreview", "OrigamiGuide", "GardenPlanner", "BikeRepair"]) {
  const html = render(`root = Card([${component}("Reference preset")])`);
  assert.ok(html.includes("Reference preset"));
  if (component === "OrigamiGuide") assert.ok(html.includes("Step 1 of 12"));
  if (component === "GardenPlanner") assert.ok(html.includes("Lettuce + radishes"));
  if (component === "BikeRepair") assert.ok(html.includes("Step 1 of 6"));
  console.log(`PASS ${component}: reference preset retained`);
}
console.log("PASS rectangular layout dimensions, incomplete cells, invalid IDs and bounded allocation");
