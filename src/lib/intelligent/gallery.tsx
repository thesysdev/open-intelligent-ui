"use client";

import { useState } from "react";
import { updateLocationQuery } from "./navigation";
import { Renderer } from "@openuidev/react-lang";
import { library } from "../library";
import { BicycleExplorerView, DistributionExplorerView, EconomyExplorerView, DroneMarketView, MontyHallView } from "./learning";
import { BillSplitterView, SavingsCalculatorView, RecipePlannerView, WardrobePlannerView } from "./tools";
import { RetroConsoleView } from "./retro";
import { RoomColorPreviewView, OrigamiGuideView, GardenPlannerView, BikeRepairView } from "./creative";
import { PacificNorthwestRoadTripView } from "./roadtrip";
import { compositionPrograms } from "./programs";
import { creativeVariants } from "./creative-variants";

const routeExample=`root = Card([heading, map, stops, suggestions])
heading = CardHeader("San Francisco, your way", "Tap a location on the map to discover its story.")
map = RouteMap([s1, s2, s3])
stops = RouteStops([s1, s2, s3])
s1 = RouteStop("Golden Gate Bridge", "Golden Gate Bridge", 37.8199, -122.4783, "9:00 · 1 hour", "An Art Deco landmark suspended above the meeting of the bay and the Pacific. Walk out toward the first tower for a different view of the city.", "Bring a layer. It can be windy even on a sunny morning.", "Landmarks")
s2 = RouteStop("Alcatraz Island", "Alcatraz Island", 37.8267, -122.4233, "11:00 · 3 hours", "Once a military fort and federal prison, the island is now part of the Golden Gate National Recreation Area.", "Reserve the official ferry ahead of time and allow time to board at Pier 33.", "History")
s3 = RouteStop("Palace of Fine Arts", "Palace of Fine Arts", 37.8024, -122.4488, "15:00 · 45 minutes", "A quiet lagoon surrounds this monumental reminder of the 1915 Panama-Pacific International Exposition.", "Walk around the lagoon for reflections of the rotunda.", "Culture")
suggestions = RouteSuggestions("Add to your day", [s4, s5])
s4 = RouteStop("Haight-Ashbury", "Haight-Ashbury", 37.7694, -122.4469, "+1 hour", "Colorful Victorian homes, record shops, and the neighborhood that helped define the Summer of Love.", "Leave time to explore the independent shops.", "Culture")
s5 = RouteStop("Lands End", "Lands End (San Francisco)", 37.781, -122.5033, "+1.5 hours", "A coastal trail through cypress trees with views of the Golden Gate.", "Wear comfortable shoes for the uneven coastal paths.", "Nature")`;

const referenceExamples = [
 {id:"bicycle",name:"Bicycle explorer",category:"Learn",prompt:"Break down the design of a 7-speed bike",description:"Explore the systems that turn pedal power into motion.",Component:BicycleExplorerView,source:"Article"},
 {id:"bike-repair",name:"Build a bicycle",category:"Create",prompt:"Help me assemble a youth bicycle, step by step",description:"A visual guide, one part at a time.",Component:BikeRepairView,source:"Video · 0:38"},
 {id:"route",name:"Plan a day out",category:"Everyday",prompt:"Plan a sightseeing route in San Francisco",description:"An interactive map with stories, photos, and stops you can change.",Component:()=> <Renderer library={library} response={routeExample}/>,source:"Video · 0:44"},
 {id:"roadtrip",name:"Pacific Northwest road trip",category:"Everyday",prompt:"Plan a ten-day road trip through the Pacific Northwest",description:"Cities, forests, mountains, and a little room for the unexpected.",Component:PacificNorthwestRoadTripView,source:"Article"},
 {id:"room",name:"Find your color",category:"Create",prompt:"Help me choose a new paint color for my living room",description:"Try a softer shade. See the room change with you.",Component:RoomColorPreviewView,source:"Video · 0:52"},
 {id:"origami",name:"Fold an origami fox",category:"Create",prompt:"Show me how to fold an origami baby fox",description:"Twelve small steps from a square of paper to a little fox.",Component:OrigamiGuideView,source:"Video · 0:58"},
 {id:"garden",name:"Plan a small garden",category:"Create",prompt:"Help me plan a small backyard vegetable garden",description:"A little space, a thoughtful plan, and room to grow.",Component:GardenPlannerView,source:"Video · 1:02"},
 {id:"recipe",name:"Sunday roast",category:"Everyday",prompt:"Plan a Sunday roast for friends, with a shopping list",description:"A menu and shopping list that adapt to your guest count.",Component:RecipePlannerView,source:"Article"},
 {id:"wardrobe",name:"Build a wardrobe",category:"Everyday",prompt:"Build me a versatile capsule wardrobe for a week away",description:"Fewer pieces. More ways to put them together.",Component:WardrobePlannerView,source:"Article"},
 {id:"clt",name:"Central limit theorem",category:"Learn",prompt:"Help me understand the central limit theorem intuitively",description:"Draw samples and watch a pattern emerge.",Component:DistributionExplorerView,source:"Article"},
 {id:"gdp",name:"GDP, explained",category:"Learn",prompt:"How does GDP work? Let me explore an economy",description:"Change one part of an economy and see the bigger picture.",Component:EconomyExplorerView,source:"Article"},
 {id:"drones",name:"The drone economy",category:"Learn",prompt:"Help me understand the drone photography market",description:"See the market, then explore the business behind it.",Component:DroneMarketView,source:"Article"},
 {id:"monty",name:"The Monty Hall problem",category:"Learn",prompt:"Explain the Monty Hall problem with an interactive game",description:"Three doors. One choice. Would you switch?",Component:MontyHallView,source:"Article"},
 {id:"bill",name:"Split the bill",category:"Everyday",prompt:"Make a bill splitter for dinner with friends",description:"Who had what? Work out everyone’s share.",Component:BillSplitterView,source:"Article"},
 {id:"savings",name:"Retirement savings",category:"Everyday",prompt:"Help me explore how my retirement savings could grow",description:"Turn today’s contributions into a picture of tomorrow.",Component:SavingsCalculatorView,source:"Article"},
 {id:"game",name:"Take a little break",category:"Create",prompt:"Make a retro arcade game I can play here",description:"A small, playable moment between everything else.",Component:RetroConsoleView,source:"Article"},
];
const compositionExamples = [
 {id:"unicycle",name:"One-wheel explorer",category:"Compose",prompt:"Show me how a unicycle works, part by part",description:"One wheel, a direct drive, and a different way to balance.",source:"Composition"},
 {id:"camera",name:"Inside a camera",category:"Compose",prompt:"Let me take apart a camera and explore its parts",description:"A lens, sensor and body. See how they fit together.",source:"Composition"},
 {id:"workshop",name:"Plan a workshop",category:"Compose",prompt:"Help me explore ticket prices and costs for a workshop",description:"A small event, a few adjustable numbers, and a clearer picture.",source:"Composition"},
 {id:"ramen",name:"Ramen for friends",category:"Compose",prompt:"Plan a vegetarian ramen dinner for four",description:"Fresh ingredients and a shopping list that grows with the table.",source:"Composition"},
 {id:"kyoto",name:"Three days in Kyoto",category:"Compose",prompt:"Plan a gentle three-day Kyoto trip with a yen budget",description:"Temple paths, riverside walks and room to wander.",source:"Composition"},
].map(item=>({...item,Component:()=> <Renderer library={library} response={compositionPrograms[item.id as keyof typeof compositionPrograms]}/>}));
export const examples = [
 ...referenceExamples.map(item=>({...item,Component:item.id in compositionPrograms ? ()=> <Renderer library={library} response={compositionPrograms[item.id as keyof typeof compositionPrograms]}/> : item.Component})),
 ...compositionExamples,
 ...creativeVariants.map(item=>({id:item.id,name:item.title,category:"Compose",prompt:item.title,description:item.description,source:"Composition",Component:()=> <Renderer library={library} response={item.response}/>})),
];

export function ExamplesGallery({onChat,onComponents,initialExample="bicycle"}:{onChat:()=>void;onComponents:()=>void;initialExample?:string}) {
 const [selected,setSelected]=useState(initialExample); const [filter,setFilter]=useState("All"); const [showList,setShowList]=useState(false);
 const example=examples.find(e=>e.id===selected)??examples[0];
 const choose=(id:string)=>{setSelected(id);setShowList(false);updateLocationQuery({view:"examples",example:id});document.querySelector(".iui-example-scroll")?.scrollTo({top:0});};
 return <div className="iui-gallery">
   <header className="iui-gallery-top"><div><span className="iui-app-name">OpenUI</span><span className="iui-top-divider"/><span>Intelligent UI</span></div><div><button className="iui-text-button" onClick={onComponents}>Components</button><button className="iui-button" onClick={onChat}>New chat <span>↗</span></button></div></header>
   <div className="iui-gallery-body"><aside className={`iui-example-nav ${showList?"is-open":""}`}><div className="iui-example-nav-title"><h1>Explore the examples</h1><p>Answers you can interact with.</p></div><div className="iui-example-filters" aria-label="Example categories">{["All","Everyday","Learn","Create","Compose"].map(c=><button key={c} aria-pressed={filter===c} onClick={()=>setFilter(c)}>{c}</button>)}</div><nav aria-label="Interactive examples">{examples.filter(e=>filter==="All"||e.category===filter).map(e=><button key={e.id} className={selected===e.id?"active":""} onClick={()=>choose(e.id)}><span>{e.name}</span>{selected===e.id&&<span aria-hidden>↗</span>}</button>)}</nav><div className="iui-nav-footer"><span className="iui-small-logo">◈</span> Built with OpenUI<a href="https://github.com/thesysdev/open-intelligent-ui" target="_blank" rel="noreferrer" aria-label="View source on GitHub">↗</a></div></aside>
   <main className="iui-example-scroll"><button className="iui-mobile-examples" onClick={()=>setShowList(!showList)}>{showList?"Close examples":"All examples"} <span>⌄</span></button><div className="iui-example-content" key={selected}><div className="iui-example-intro"><span className="iui-example-category">{example.category}</span><h1>{example.name}</h1><p>{example.description}</p></div><div className="iui-example-prompt"><span>{example.prompt}</span></div><example.Component/><div className="iui-example-caption"><span>Interactive example · {example.source}</span>{example.source!=="Composition"&&<a href="https://openai.com/index/gpt-6-for-everyone/" target="_blank" rel="noreferrer">View reference ↗</a>}</div></div></main></div>
 </div>;
}
