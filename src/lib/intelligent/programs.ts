import { library } from "../library";
import { bicycleDiagram, cameraDiagram, unicycleDiagram } from "./diagram-presets";
import type { DiagramData } from "./diagram";
import type { SceneData } from "./scene";

type UINode = { component: string; props: Record<string, unknown> };
type Expression = { expression: string };
export const ui = (component: string, props: Record<string, unknown>): UINode => ({ component, props });
export const expression = (value: string): Expression => ({ expression: value });
/** Fixture authoring only. The result goes through the exact same parser as chat. */
export function encodeUI(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(encodeUI).join(",")}]`;
  if (value && typeof value === "object" && "expression" in value) return (value as Expression).expression;
  if (value && typeof value === "object" && "component" in value) {
    const node = value as UINode;
    const component = library.components[node.component];
    if (!component) throw new Error(`Unknown component: ${node.component}`);
    const keys = Object.keys(component.props.shape);
    const unknown = Object.keys(node.props).filter(key=>!keys.includes(key));
    if(unknown.length) throw new Error(`${node.component}: unknown props ${unknown.join(", ")}`);
    let last = keys.length - 1;
    while (last >= 0 && node.props[keys[last]] === undefined) last--;
    return `${node.component}(${keys.slice(0, last + 1).map(key => encodeUI(node.props[key])).join(",")})`;
  }
  return JSON.stringify(value ?? null);
}
export const sceneNode = (scene: SceneData) => ui("SceneDrawing", {viewBox:scene.viewBox,shapes:scene.shapes.map(shape=>ui("SceneShape",shape))});
export const diagramNode = (data: DiagramData, props: Record<string, unknown> = {}) => ui("ExplodedDiagram", {...data,...props,parts:data.parts.map(part=>ui("DiagramPart",{...part,shapes:part.shapes.map(shape=>ui("SceneShape",shape))}))});
export const program = (children: UINode[], state = "") => `${state}root = ${encodeUI(ui("Card",{children}))}`;

export const bicycleProgram = program([diagramNode(bicycleDiagram)]);
export const unicycleProgram = program([diagramNode(unicycleDiagram)]);
export const cameraProgram = program([ui("InteractivePanel",{
  title:"Inside a camera",
  description:"Move the slider to separate the lens, body, sensor and cover.",
  children:[
    diagramNode(cameraDiagram,{title:"Camera assembly",showControls:false,showHeading:false,explode:expression("$spread"),selected:expression("$part")}),
    ui("RangeControl",{name:"spread",label:"Separate the parts",min:0,max:100,step:1,value:expression("$spread"),unit:"%"}),
    ui("ChoiceControl",{name:"part",label:"Focus on a system",options:["All",...new Set(cameraDiagram.parts.map(part=>part.group??part.label))],value:expression("$part")}),
  ],
})], '$spread = 25\n$part = "All"\n');

export const economyProgram = program([ui("InteractivePanel",{
  title:"What makes up GDP?",description:"An economy, in four parts.",badge:"Illustrative economy",
  children:[
    ui("ValueDisplay",{label:"Total output",value:expression("($consumer + $investment + $government + $exports) / 1000"),prefix:"$",suffix:" trillion",decimals:2}),
    ui("ContributionChart",{label:"GDP contributions",items:[
      ["Consumer spending","$consumer","#3472d5"],["Business investment","$investment","#128169"],["Government spending","$government","#946d00"],["Net exports","$exports","#b69bd2"],
    ].map(([label,value,color])=>ui("Contribution",{label,value:expression(value),color,prefix:"$",suffix:"B"}))}),
    ui("InteractiveGroup",{columns:"two",children:[
      ["consumer","Consumer spending",0,1200],["investment","Business investment",0,500],["government","Government spending",0,500],["exports","Net exports",-200,500],
    ].map(([name,label,min,max])=>ui("RangeControl",{name,label,min,max,step:10,value:expression(`$${name}`),unit:"B"}))}),
    ui("Buttons",{buttons:[ui("Button",{label:"↻ Reset economy",action:expression("Action([@Set($consumer, 600), @Set($investment, 200), @Set($government, 170), @Set($exports, 30)])"),variant:"tertiary",size:"small"})]}),
    ui("TextContent",{text:"**GDP = C + I + G + (X − M)**\n\nGDP counts final goods and services produced within a country. Imports subtract from total output. Move any slider to explore the effect."}),
    ui("KnowledgeCheck",{question:"The same goods cost 10% more this year. What changes?",options:["Real GDP increases by 10%","Nominal GDP rises; real GDP is unchanged","Both measures stay the same"],answer:1,explanation:"Real GDP adjusts for price changes. Higher prices alone raise nominal GDP, but not real output."}),
  ],
})],"$consumer = 600\n$investment = 200\n$government = 170\n$exports = 30\n");

export const workshopProgram = program([ui("InteractivePanel",{
  title:"Make your workshop work",description:"Adjust the seats and ticket price to explore a small event.",badge:"Illustrative",
  children:[
    ui("InteractiveGroup",{columns:"two",children:[
      ui("ValueDisplay",{label:"Ticket revenue",value:expression("$seats * $ticket"),prefix:"₹"}),
      ui("ValueDisplay",{label:"After fixed costs",value:expression("$seats * $ticket - $cost"),prefix:"₹"}),
    ]}),
    ui("ContributionChart",{label:"Event budget",items:[
      ui("Contribution",{label:"Venue and materials",value:expression("$cost"),color:"#946d00",prefix:"₹"}),
      ui("Contribution",{label:"Remaining revenue",value:expression("$seats * $ticket - $cost"),color:"#128169",prefix:"₹"}),
    ]}),
    ui("InteractiveGroup",{columns:"two",children:[
      ui("RangeControl",{name:"seats",label:"People attending",min:1,max:50,step:1,value:expression("$seats")}),
      ui("RangeControl",{name:"ticket",label:"Ticket price",min:100,max:2000,step:50,value:expression("$ticket"),unit:" INR"}),
    ]}),
    ui("RangeControl",{name:"cost",label:"Venue and materials",min:0,max:20000,step:500,value:expression("$cost"),unit:" INR"}),
    ui("TextContent",{text:"A planning scenario. Costs exclude taxes and payment fees. If costs exceed ticket sales, the remaining revenue becomes negative."}),
  ],
})],"$seats = 20\n$ticket = 750\n$cost = 5000\n");

export const ramenProgram = program([ui("RecipePlanner",{
  title:"Vegetable ramen for friends",description:"A simple, warming bowl with a shopping list that scales.",
  baseGuests:2,guests:4,
  ingredients:[
    {name:"Ramen noodles",quantity:200,unit:"g",scaling:"proportional"},
    {name:"Firm tofu",quantity:200,unit:"g",scaling:"proportional"},
    {name:"Mushrooms",quantity:150,unit:"g",scaling:"proportional"},
    {name:"Vegetable stock",quantity:800,unit:"ml",scaling:"proportional"},
    {name:"Pak choi",quantity:2,unit:"heads",scaling:"whole"},
  ].map(item=>ui("RecipeIngredient",item)),
  steps:[
    {time:"20 min before",title:"Prepare the toppings",description:"Slice the mushrooms and tofu. Wash and halve the pak choi."},
    {time:"10 min before",title:"Build the broth",description:"Bring the vegetable stock to a simmer. Add mushrooms, tofu and pak choi; cook until tender."},
    {time:"Just before serving",title:"Cook and serve",description:"Cook noodles to package directions, divide between bowls and add the hot broth and toppings."},
  ].map(item=>ui("RecipeStep",item)),
  dishes:[ui("MenuDish",{name:"Vegetable ramen",description:"Noodles, tofu, greens and mushrooms in a light broth.",imageUrl:""})],
})]);

export const kyotoProgram = program([ui("RoadTripPlanner",{
  title:"Three slow days in Kyoto",description:"Temple paths, riverside walks and time to wander.",region:"Kyoto",currency:"JPY",
  lodgingPerNight:16000,foodPerPersonDay:4500,transportPerDay:1400,transportFixed:0,activitiesPerPerson:5000,
  travelNote:"Example itinerary and budget. Check current hours and transport before setting out.",
  days:[
    {day:1,name:"Higashiyama",region:"Eastern Kyoto",category:"Culture",wiki:"Kiyomizu-dera",lat:34.9949,lng:135.785,description:"Start at Kiyomizu-dera, then wander the sloping lanes of Higashiyama.",stay:"Kyoto",highlight:"Leave time for tea and small shops."},
    {day:2,name:"Arashiyama",region:"Western Kyoto",category:"Nature",wiki:"Arashiyama",lat:35.0094,lng:135.6675,description:"Visit the bamboo grove early, then follow the river away from the busiest paths.",stay:"Kyoto",highlight:"Balance the main sights with a quiet riverside walk."},
    {day:3,name:"Fushimi",region:"Southern Kyoto",category:"Culture",wiki:"Fushimi Inari-taisha",lat:34.9671,lng:135.7727,description:"Walk through the torii gates at your own pace before returning for an easy afternoon.",stay:"Kyoto",highlight:"Choose a shorter section if the full hillside walk feels too long."},
  ].map(day=>ui("TripStop",day)),
})]);

export const compositionPrograms = {bicycle:bicycleProgram,unicycle:unicycleProgram,camera:cameraProgram,gdp:economyProgram,workshop:workshopProgram,ramen:ramenProgram,kyoto:kyotoProgram};
