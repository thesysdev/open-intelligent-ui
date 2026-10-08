import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createParser, Renderer } from "@openuidev/react-lang";
import { library } from "../src/lib/library";
import { compositionPrograms } from "../src/lib/intelligent/programs";
import { safePaint } from "../src/lib/intelligent/scene";
import { unicycleDiagram, cameraDiagram } from "../src/lib/intelligent/diagram-presets";
import { DiagramCanvas } from "../src/lib/intelligent/diagram";
import { promptOptions } from "../src/lib/prompt-options";

const parser = createParser(library.toJSONSchema());
for (const [name,response] of Object.entries(compositionPrograms)) {
  const parsed = parser.parse(response);
  assert.deepEqual(parsed.meta.errors ?? [], [], name);
  assert.ok(parsed.root, name);
  const html = renderToString(createElement(Renderer,{library,response})).replace(/<!--.*?-->/g,"");
  assert.ok(html.includes("iui-"), name);
  if (name==="unicycle") {
    assert.equal((html.match(/data-diagram-part="wheel"/g)??[]).length,1);
    assert.ok(!html.includes("rear-wheel"));
    assert.ok(!html.includes("7-speed"));
  }
  // OpenUI initializes reactive declarations in a client effect, after SSR.
  if (name==="workshop") assert.deepEqual(parsed.stateDeclarations,{"$seats":20,"$ticket":750,"$cost":5000});
  if (name==="gdp") assert.deepEqual(parsed.stateDeclarations,{"$consumer":600,"$investment":200,"$government":170,"$exports":30});
  if (name==="ramen") { assert.ok(html.includes("400 g")); assert.ok(!html.includes("lamb")); assert.ok(JSON.stringify(parsed).includes("Prepare the toppings")); }
  if (name==="kyoto") { assert.ok(!html.includes("Pacific Northwest")); assert.ok(!html.includes("Seattle")); assert.ok(html.includes("Kyoto")); }
  // An incomplete streamed response must remain renderable while records arrive.
  for (let cut=1;cut<response.length;cut+=Math.max(1,Math.floor(response.length/20))) {
    assert.doesNotThrow(()=>renderToString(createElement(Renderer,{library,response:response.slice(0,cut),isStreaming:true})),`${name}: partial at ${cut}`);
  }
  console.log(`PASS ${name}: parsed, rendered and streamed`);
}
const assembled = renderToString(<DiagramCanvas {...unicycleDiagram} explode={0}/>);
const exploded = renderToString(<DiagramCanvas {...unicycleDiagram} explode={100}/>);
assert.ok(assembled.includes('translate(0 0)'));
assert.ok(exploded.includes('translate(-115 40)'));
assert.notEqual(assembled,exploded);
assert.equal(cameraDiagram.parts.length,4);
assert.equal(safePaint("url(https://example.com/image.svg)"),"none");
assert.equal(safePaint("#3472d5"),"#3472d5");
console.log("PASS diagram geometry and bounded paints");
for(const example of promptOptions.examples.filter(text=>text.startsWith("Example — "))) {
  const response=example.slice(example.indexOf("\n")+1);
  const result=parser.parse(response);
  assert.deepEqual(result.meta.errors??[],[],example.split("\n")[0]);
  assert.ok(result.root);
  assert.doesNotThrow(()=>renderToString(createElement(Renderer,{library,response})));
}
console.log("PASS every model guidance example parses and renders");
