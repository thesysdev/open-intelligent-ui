import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { createLibrary, createParser, defineComponent, Renderer } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { PacificNorthwestRoadTripView, RoadTripPlanner, TripStop } from "../src/lib/intelligent/roadtrip";

const root = defineComponent({name:"TripTestRoot",description:"Trip test root",props:z.object({children:z.array(RoadTripPlanner.ref)}),component:({props,renderNode})=><div>{renderNode(props.children)}</div>});
const library = createLibrary({root:"TripTestRoot",components:[root,RoadTripPlanner,TripStop]});
const parser = createParser(library.toJSONSchema());
const stop = 'stop = TripStop(1,"Temple walk","Kyoto","Culture","Kyoto",35,135,"Explore the temple lanes.","Kyoto","A slow walk")';
const response = 'root = TripTestRoot([trip])\n' + stop + '\ntrip = RoadTripPlanner("Kyoto for six",[stop],"A group trip","Kyoto","JPY",16000,4500,1400,0,5000,null,"Check local information.",6,"Wet","Budget-minded",[1,2,3,6],["Dry","Wet"])';
assert.deepEqual(parser.parse(response).meta.errors ?? [], []);
const html = renderToString(<Renderer library={library} response={response}/>).replace(/<!--.*?-->/g, "");
assert.ok(html.includes("6 people"));
assert.ok(html.includes("Wet · 6 people · Budget-minded"));
assert.ok(html.includes("Route map with 1 day stops, starting in Kyoto"));
assert.ok(!html.includes("Pacific Northwest"));
assert.ok(!html.includes("Seattle"));
assert.ok(!html.includes("Summer"));

const noDays = 'root = TripTestRoot([RoadTripPlanner("Kyoto")])';
assert.ok(!renderToString(<Renderer library={library} response={noDays}/>).includes("Seattle"));
const stream = 'root = TripTestRoot([RoadTripPlanner("Kyoto", [stop])])\n' + stop;
for (let cut=1;cut<=stream.length;cut++) {
  const partial = renderToString(<Renderer library={library} response={stream.slice(0,cut)} isStreaming/>);
  assert.ok(!partial.includes("Seattle"), `Partial at ${cut} must not inherit a reference itinerary.`);
}
const optionalProps = Object.keys(RoadTripPlanner.props.shape).map(key=>key === "title" ? JSON.stringify("Tokyo with three") : key === "initialPartySize" ? "3" : "null").join(",");
const optionalHtml = renderToString(<Renderer library={library} response={`root = TripTestRoot([RoadTripPlanner(${optionalProps})])`}/>);
assert.ok(optionalHtml.includes("3 people"));
assert.ok(renderToString(<PacificNorthwestRoadTripView/>).includes("Seattle"));
assert.ok(renderToString(<Renderer library={library} response='root = TripTestRoot([RoadTripPlanner("10 days in the Pacific Northwest")])'/>).includes("Seattle"));
console.log("PASS configurable travel party/seasons, generic map labels, partial streaming, explicit preset selection and missing optional fields");
