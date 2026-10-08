"use client";

import { defineComponent } from "@openuidev/react-lang";
import { useId } from "react";
import { z } from "zod/v4";
import { drawingData, SceneDrawing, type SceneData } from "./scene";
import {
  AssemblyGuideView, EditableGridView, IllustratedStepGuideView, RecolorableSceneView,
  ColorSwatch, ColorRegion, GuideStep, GridOption, GridLayout, creativeCompositionComponents, resolveGuideSteps,
  type SwatchData, type RegionData, type GuideStepData, type GridOptionData, type GridLayoutData,
} from "./creative-composition";
import "./creative.css";

const paintColors = [
  { name: "Periwinkle", hex: "#949AC2" },
  { name: "Mineral blue", hex: "#639CA9" },
  { name: "Clarity", hex: "#63A8F8" },
  { name: "Sea-glass teal", hex: "#829FC2" },
  { name: "Eucalyptus", hex: "#7BA89F" },
  { name: "Cornflower blue", hex: "#7998AB" },
];

function RoomIllustration({ color, id }: { color: string; id: string }) {
  return <svg viewBox="0 0 760 430" role="img" aria-label={`Illustrated living room with ${color} walls`}>
    <defs>
      <linearGradient id={`${id}-light`} x1="0" x2="1"><stop stopColor="#fff" stopOpacity=".37"/><stop offset="1" stopColor="#fff" stopOpacity=".04"/></linearGradient>
      <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#bc9871"/><stop offset="1" stopColor="#dfbf98"/></linearGradient>
      <linearGradient id={`${id}-sofa`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e0d7c8"/><stop offset="1" stopColor="#b3a896"/></linearGradient>
      <filter id={`${id}-shadow`}><feGaussianBlur stdDeviation="8"/></filter>
      <clipPath id={`${id}-room`}><rect width="760" height="430" rx="14"/></clipPath>
    </defs>
    <g clipPath={`url(#${id}-room)`}>
      <rect width="760" height="430" fill="#eae8df"/>
      <g className="iui-room-walls" fill={color}><path d="M0 0H527V285L0 349Z"/><path d="M527 0H760V349L527 285Z"/></g>
      <path d="M0 0H527V285L0 349Z" fill={`url(#${id}-light)`}/><path d="M527 0H760V349L527 285Z" fill="#000" opacity=".055"/>
      <path d="M0 349 527 285 760 349V430H0Z" fill={`url(#${id}-floor)`}/>
      <g stroke="#977956" strokeOpacity=".26"><path d="M40 430 548 291M207 430 570 296M406 430 602 305M651 430 667 324M0 382 590 303M0 414 654 320M302 430 760 368"/></g>
      <path d="M0 341 527 278 760 341V350L527 288 0 351Z" fill="#f6f3e9"/>
      <path d="M0 0H760L674 38 527 15 0 69Z" fill="#e3d6ba"/>
      <g stroke="#ae9271" strokeWidth="12"><path d="M32 0 217 42M270 0 414 25M522 0 603 27M720 0 736 12"/></g>
      <g><path d="M610 89 721 111V283L610 260Z" fill="#f6f3e8"/><path d="M620 100 711 117V269L620 252Z" fill="#c7dedc"/><path d="M620 183 711 200M666 110V260" stroke="#f7f5ef" strokeWidth="8"/><path d="M620 229Q662 173 711 220V269L620 251Z" fill="#98b79a"/><path d="M621 238Q672 211 710 243V268L621 252Z" fill="#b4c29e"/></g>
      <path d="M607 283 724 305 481 406 324 379Z" fill="#fff8d7" opacity=".24"/>
      <ellipse cx="337" cy="353" rx="211" ry="30" fill="#554939" opacity=".13" filter={`url(#${id}-shadow)`}/>
      <path d="M90 348 392 310 580 372 274 421Z" fill="#e9e5db"/><g stroke="#d0c7b8" opacity=".48"><path d="m124 350 296 58m-261-64 297 54m-256-62 299 55m-254-61 296 52"/></g>
      <g><path d="M176 274Q176 258 192 255L414 233Q428 232 431 248L445 322 182 350Z" fill={`url(#${id}-sofa)`}/><path d="m181 304 255-26 14 55-257 27Z" fill="#d7cdbd"/><path d="M171 287Q153 282 153 298L161 356 193 360 188 306Q187 291 171 287Z" fill="#beb3a2"/><path d="M433 260Q450 252 455 270L466 329 442 341 429 285Q425 265 433 260Z" fill="#beb3a2"/><path d="m197 307 115-12 2 38-117 13Zm120-12 110-12 10 37-119 14Z" fill="#e5dccd"/><path d="m184 356 3 18m258-40 5 18" stroke="#735e47" strokeWidth="8"/><path d="m215 263 49-4 12 47-52 7Z" fill="#eee8dc"/><path d="m344 249 48-4 6 45-51 8Z" fill="#aab4a4"/></g>
      <g><ellipse cx="363" cy="358" rx="66" ry="18" fill="#987953"/><path d="M297 357V363Q363 390 429 361V356" fill="#b09165"/><path d="m319 374-5 30m97-33 7 28" stroke="#745c3f" strokeWidth="6"/><rect x="343" y="343" width="36" height="10" rx="2" fill="#eee9dc"/><rect x="348" y="337" width="28" height="7" rx="1" fill="#929f88"/></g>
      <g><path d="M113 158V312M92 314H135" stroke="#6e6558" strokeWidth="4"/><path d="m79 154 12-48h42l13 48Z" fill="#f3e5c9"/><ellipse cx="112" cy="154" rx="34" ry="7" fill="#ddceb0"/></g>
      <g><path d="m551 319 5 32h35l5-32Z" fill="#bf9d77"/><ellipse cx="574" cy="319" rx="23" ry="7" fill="#756952"/><path d="M574 320V247" stroke="#596f51" strokeWidth="3"/><g fill="#5d7958"><ellipse cx="561" cy="268" rx="9" ry="23" transform="rotate(-37 561 268)"/><ellipse cx="586" cy="258" rx="10" ry="25" transform="rotate(35 586 258)"/><ellipse cx="558" cy="293" rx="10" ry="23" transform="rotate(-55 558 293)"/><ellipse cx="589" cy="286" rx="11" ry="23" transform="rotate(48 589 286)"/></g></g>
      <g><path d="m277 98 72-4v80l-72 7Z" fill="#e8ddc9" stroke="#9b8465" strokeWidth="4"/><path d="m294 150 14-33 24 46-40 4Z" fill="#b2b79c"/><circle cx="325" cy="115" r="9" fill="#d4ad79"/></g>
    </g>
  </svg>;
}

export function RoomColorPreviewView({ title = "Live wall color preview", palette = paintColors, regions = [{ id: "walls", label: "Wall", originalColor: "#e8e5dc" }], scene, description = "A little color changes the whole room." }: { title?: string; palette?: SwatchData[]; regions?: RegionData[]; scene?: SceneData; description?: string }) {
  const id = useId().replaceAll(":", "");
  return <RecolorableSceneView title={title} description={description} palette={palette} regions={regions} scene={scene} originalLabel={scene ? "Original colors" : "Warm white"} renderScene={scene ? undefined : colors => <RoomIllustration color={colors[regions[0]?.id] ?? "#e8e5dc"} id={id}/>} footnote="Illustrated preview. Paint appearance varies with light and finish."/>;
}

const folds = [
  ["Start with a square", "Place your paper color-side down. Turn the square so one corner points toward you.", "A 6-inch square is a comfortable size to start with."],
  ["Fold corner to corner", "Bring the bottom corner up to meet the top corner. Press along the long edge to make a triangle.", "Line up the corners before you press the crease."],
  ["Find the center", "Fold the right corner over to the left corner, crease, and unfold. You now have a center guide.", "Only the center crease stays. Open back to the triangle."],
  ["Bring the corners up", "Fold both bottom corners to meet the top point, making a smaller diamond.", "The folded edges should meet in the middle."],
  ["Turn the paper over", "Flip the diamond over without unfolding the two flaps.", "Keep the open ends pointing upward."],
  ["Fold the diamond in half", "Fold the left side behind the right side along the center crease.", "You should have a layered right triangle."],
  ["Set the body upright", "Rotate the triangle so the long folded edge sits along the bottom.", "The open, layered corner becomes the head."],
  ["Make room for the head", "Fold the layered right edge toward the middle, about one third of the way across.", "Crease through all the layers, then open this fold slightly."],
  ["Separate the three layers", "Gently spread the three points at the top of the new fold. Keep the two outer points upright.", "The two outer points will become the ears."],
  ["Open and flatten the head", "Open the middle flap’s pocket. Press its tip downward, spreading both sides into a small diamond.", "Center the nose over the crease; keep both ears raised."],
  ["Give your fox a tail", "Fold the far-left body corner toward the front to make a small tail that helps your fox stand.", "Adjust the tail fold until the base feels steady."],
  ["Say hello to your fox", "Open the base just a little and stand your fox up. Add two eyes and a little nose if you like.", "Try a second fox with a smaller square of paper."],
];

function FoldIllustration({ step }: { step: number }) {
  const line = { stroke: "#b66a30", strokeWidth: 1.5, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 500 285" role="img" aria-label={`Origami fox step ${step + 1}: ${folds[step][0]}`}>
    <g className="iui-paper-shape" key={step}>
      {step === 0 && <><path d="M250 34 358 142 250 250 142 142Z" fill="#f4dbc0" {...line}/><path d="m250 242 0-186" className="iui-fold-arrow"/><path d="m245 66 5-10 5 10" className="iui-fold-arrow"/></>}
      {step === 1 && <><path d="M112 216 250 69 388 216Z" fill="#f88c35" {...line}/><path d="M125 220Q250 263 369 220" className="iui-fold-arrow"/><path d="m361 218 10 2-7 8" className="iui-fold-arrow"/></>}
      {step === 2 && <><path d="M112 216 250 69 388 216Z" fill="#f88c35" {...line}/><path d="M250 70V216" className="iui-fold-crease"/><path d="M350 174Q285 132 266 177" className="iui-fold-arrow"/><path d="m265 166 1 12 10-6" className="iui-fold-arrow"/></>}
      {step === 3 && <><path d="M250 43 351 144 250 245 149 144Z" fill="#f88c35" {...line}/><path d="M250 44V245L149 144Z" fill="#f3a059" {...line}/><path d="M250 44 351 144 250 245Z" fill="#f58a32" {...line}/><path d="M250 145 201 96M250 145 300 94" className="iui-fold-crease"/></>}
      {step === 4 && <><path d="M250 43 351 144 250 245 149 144Z" fill="#ee822d" {...line}/><path d="M250 44V244" className="iui-fold-crease"/><path d="M132 118C83 70 126 46 168 65M168 65l-10-1 2-11" className="iui-fold-arrow"/><path d="M365 180c48 48 6 73-35 53m0 0 10 1-2 11" className="iui-fold-arrow"/></>}
      {step === 5 && <><path d="M226 45 328 146 226 246Z" fill="#f58a32" {...line}/><path d="M226 45V246" stroke="#b66a30" strokeWidth="3"/><path d="M174 108Q141 166 207 186m0 0-6-9m6 9-12 1" className="iui-fold-arrow"/></>}
      {step === 6 && <><path d="M140 223 353 223 353 44Z" fill="#f58a32" {...line}/><path d="M344 52V222" stroke="#dc782d" strokeWidth="2"/><path d="M337 58V222" stroke="#dc782d" strokeWidth="2"/></>}
      {step === 7 && <><path d="M138 226 350 226 350 47Z" fill="#f58a32" {...line}/><path d="M294 93 294 226 350 226Z" fill="#f9a15b" {...line}/><path d="M294 93V226" className="iui-fold-crease"/><path d="M373 133q-2-35-49-27m0 0 9-6m-9 6 10 6" className="iui-fold-arrow"/></>}
      {step === 8 && <><path d="M145 228 335 228 335 52Z" fill="#f58a32" {...line}/><path d="M280 174 250 77 300 98 335 52 335 228Z" fill="#f99647" {...line}/><path d="M280 174 299 98 314 115 335 53" fill="none" {...line}/><path d="M299 99 335 228M281 173 335 228" fill="none" {...line}/></>}
      {step >= 9 && <><path d="M144 230 336 230 336 43Z" fill="#f58a32" {...line}/><path d="M274 139 237 72 297 88 336 43 335 228Z" fill="#f7984a" {...line}/><path d="M275 138 297 88 330 120 308 159Z" fill="#ffa75d" {...line}/><path d="M297 88 309 159 336 228M275 138 336 228M330 120 336 43" fill="none" {...line}/>{step >= 10 && <path d="M144 230 202 176 204 230Z" fill="#ffaf6c" {...line}/>} {step === 11 && <><circle cx="288" cy="126" r="3" fill="#493626"/><circle cx="315" cy="129" r="3" fill="#493626"/><path d="m305 149 7 0-3 7Z" fill="#493626"/><path d="M142 246q100 20 200-1" stroke="#ded8ce" strokeWidth="2" fill="none"/></>}</>}
    </g>
  </svg>;
}

export function OrigamiGuideView({ title = "Let’s fold an origami baby fox!", steps, description, level = "Beginner" }: { title?: string; steps?: GuideStepData[]; description?: string; level?: string }) {
  return <IllustratedStepGuideView title={title} description={description ?? (steps ? undefined : "This beginner-friendly version takes about 5–10 minutes.")} level={level} steps={steps ?? folds.map(([title, body, tip], index) => ({ id: `fox-${index}`, title, body, tip }))} renderIllustration={steps ? undefined : step => <FoldIllustration step={step}/>} repeatLabel="Fold another ↻"/>;
}

const plants = [
  { name: "Lettuce + radishes", short: "Lettuce", note: "24-inch planter", color: "#d0e2c4", ink: "#4d873c", icon: "leaf", tip: "Keep the soil evenly moist. Harvest outside leaves as they grow." },
  { name: "Snap peas", short: "Peas", note: "Pot + trellis", color: "#d0e2c4", ink: "#4d873c", icon: "peas", tip: "Place the trellis at the back so it doesn’t shade your other crops." },
  { name: "Kale", short: "Kale", note: "12-inch pot", color: "#e5d9c2", ink: "#b68530", icon: "kale", tip: "Leave room for the mature leaves. Pick lower leaves first." },
  { name: "Herbs", short: "Herbs", note: "1 to 2 small pots", color: "#e5d9c2", ink: "#b68530", icon: "herbs", tip: "Keep mint in its own pot. Basil enjoys a warm, sunny position." },
  { name: "Strawberries", short: "Berries", note: "Wide shallow pot", color: "#eed7d5", ink: "#b45e60", icon: "berry", tip: "Let the berries hang over the edge of the planter to stay dry." },
  { name: "Tomatoes", short: "Tomatoes", note: "Large pot + stake", color: "#eed7d5", ink: "#b45e60", icon: "tomato", tip: "Choose a compact variety and add its support when you plant." },
];

function PlantIcon({ kind }: { kind: string }) {
  return <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "leaf" && <><path d="M20 34C8 33 7 22 12 19c-5-8 7-13 10-5 6-9 15-2 10 5 7 6-3 16-12 15Z"/><path d="M20 33V15m0 9-6-5m6 10 8-9M13 30l-2-8"/></>}
    {kind === "peas" && <><path d="M6 29C24 30 31 17 33 8c5 12-5 29-20 28-4 0-6-3-7-6Z"/><circle cx="14" cy="30" r="2.5"/><circle cx="21" cy="27" r="2.5"/><circle cx="27" cy="21" r="2.5"/><path d="M33 8V5"/></>}
    {kind === "kale" && <><path d="M20 5c7 4 3 5 7 7 7 3 0 6 5 10 2 4-7 11-12 13-8-6-13-11-10-15 5-4-4-6 3-9 4-1 0-3 7-6Z"/><path d="M20 36V12m0 10-6-4m6 11 7-5m-7-8 5-4"/></>}
    {kind === "herbs" && <><path d="M20 36V14m0 14-8-7m8 1 9-8"/><path d="M20 18C9 14 17 5 20 4c5 5 5 11 0 14Zm-8 5c-7-1-10-7-8-11 8 0 10 5 8 11Zm17-8c-1-7 4-10 8-11 2 7-1 12-8 11ZM20 31c-9 0-12 1-12 7 7 0 11-2 12-7Zm3-4c3-6 9-6 12-3-1 7-7 9-12 3Z"/></>}
    {kind === "berry" && <><path d="M9 16c5-6 17-6 22 0 4 8-6 18-11 21C12 32 5 24 9 16Z"/><path d="m20 15-9-7 8 2 2-7 3 7 7-2-7 8M14 20v1m11-2v1m-6 5v1m7 0v1m-10 4v1"/></>}
    {kind === "tomato" && <><path d="M20 14C6 8 1 29 14 34c17 8 28-13 15-19-3-2-6-1-9-1Z"/><path d="m20 14-4-7 7 4 8-4-5 9m-6-2 1-10m-7 15c-4 2-6 7-4 10"/></>}
  </svg>;
}

export function GardenPlannerView({ title = "Your 4 × 4 ft garden plan", options, layouts, description = "A small space with plenty of possibility.", footer = "☀ 6+ hours of sunlight" }: { title?: string; options?: GridOptionData[]; layouts?: GridLayoutData[]; description?: string; footer?: string }) {
  const gardenOptions = options ?? plants.map((plant, index) => ({ ...plant, id: String(index) }));
  const gardenLayouts = layouts ?? [
    { id: "planters", label: "Four planters", rows: 2, columns: 2, cells: ["0", "1", "2", "3"], cellLabel: "Planter", summary: "4 ft × 4 ft" },
    { id: "squares", label: "16-square bed", rows: 4, columns: 4, cells: [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3].map(String), cellLabel: "Square", summary: "4 ft × 4 ft" },
  ];
  return <EditableGridView title={title} description={description} options={gardenOptions} layouts={gardenLayouts} optionLabel="plant" renderIcon={options ? undefined : option => <PlantIcon kind={option.icon ?? "leaf"}/>} footnote="Tap any planter to change what grows there. Keep space around the garden to reach and water each plant." footer={footer}/>;
}

const repairSteps = [
  {title:"Get everything ready",find:"Find · Frame, wheels, saddle, handlebars and pedals",body:"Lay out the parts on a soft surface. Match them to the manufacturer’s parts list before you begin.",check:"All parts accounted for",part:0},
  {title:"Fit the handlebars",find:"Find · Handlebar and stem assembly",body:"Position the stem and center the handlebars. Follow your bike’s manual for insertion depth, clamp order and torque.",check:"Handlebars aligned and secured",part:1},
  {title:"Set the saddle height",find:"Find · Saddle and seatpost",body:"Insert the seatpost above its minimum insertion mark. Start low enough for the rider to put both feet on the ground.",check:"Saddle securely fitted",part:2},
  {title:"Match the pedals",find:"Find · Left and right pedals",body:"Identify each pedal’s L or R marking before installation. The pedals belong on opposite crank arms; follow the manual’s threading and tightening directions.",check:"Both pedals checked",part:3},
  {title:"Secure the wheels",find:"Find · Front and rear wheel fasteners",body:"Confirm both wheels sit squarely in the frame and fork. Tighten the fasteners according to the manufacturer’s instructions.",check:"Both wheels securely attached",part:4},
  {title:"Run the final checks",find:"Check · Brakes, tires, steering and fasteners",body:"Check tire pressure, confirm each brake stops its wheel, and look over every fastener. Have a qualified mechanic inspect anything you’re unsure about before riding.",check:"Safety checks complete",part:0},
];

function YouthBike({ active, exploded }: { active: number; exploded: boolean }) {
 const visible=(n:number)=>active===0||active===n?1:.2;
 return <svg viewBox="0 0 640 365" role="img" aria-label={`${exploded?"Exploded":"Assembled"} youth bicycle; ${active?repairSteps.find(s=>s.part===active)?.title:"all parts shown"}`}>
  <g className="iui-repair-part" style={{opacity:visible(4),transform:exploded?"translate(-35px, 25px)":"none"}}><circle cx="166" cy="245" r="85" fill="none" stroke="#3d4143" strokeWidth="13"/><circle cx="166" cy="245" r="74" fill="none" stroke="#c5c9cb" strokeWidth="3"/>{Array.from({length:20},(_,i)=><line key={i} x1="166" y1="245" x2={(166+73*Math.cos(i*Math.PI/10)).toFixed(3)} y2={(245+73*Math.sin(i*Math.PI/10)).toFixed(3)} stroke="#aeb3b6"/>)}<circle cx="166" cy="245" r="7" fill="#91999e"/></g>
  <g className="iui-repair-part" style={{opacity:visible(4),transform:exploded?"translate(35px, 25px)":"none"}}><circle cx="474" cy="245" r="85" fill="none" stroke="#3d4143" strokeWidth="13"/><circle cx="474" cy="245" r="74" fill="none" stroke="#c5c9cb" strokeWidth="3"/>{Array.from({length:20},(_,i)=><line key={i} x1="474" y1="245" x2={(474+73*Math.cos(i*Math.PI/10)).toFixed(3)} y2={(245+73*Math.sin(i*Math.PI/10)).toFixed(3)} stroke="#aeb3b6"/>)}<circle cx="474" cy="245" r="7" fill="#91999e"/></g>
  <g style={{opacity:active? .38:1}} fill="none" stroke="#ead24d" strokeWidth="14" strokeLinejoin="round"><path d="m168 245 87-102 51 108-138-6 67-57 146-45-75 108"/><path d="m255 143 70-2 82-33"/><path d="m390 85 27 84"/></g><path d="m417 169 56 76" fill="none" stroke="#c4c7c5" strokeWidth="13"/>
  <g className="iui-repair-part" style={{opacity:visible(1),transform:exploded?"translate(20px, -24px)":"none"}} fill="none" stroke="#555d60" strokeWidth="7" strokeLinecap="round"><path d="m394 94-14-41-43-9m43 9 41-10"/><path d="m326 42 21 4m62-1 24-8" strokeWidth="12"/><path d="M410 44q51 31 1 113" strokeWidth="2"/></g>
  <g className="iui-repair-part" style={{opacity:visible(2),transform:exploded?"translate(-18px, -28px)":"none"}}><path d="m252 142-18-57" stroke="#91989a" strokeWidth="10"/><path d="M199 83q4-13 26-6l43 4q12 7-1 10l-40 2Z" fill="#424849"/></g>
  <g className="iui-repair-part" style={{opacity:visible(3),transform:exploded?"translate(0px, 25px)":"none"}}><path d="M168 232 304 227q32 17 4 38l-140-12Z" fill="#a1a6a5"/><circle cx="306" cy="249" r="21" fill="#cccfc8" stroke="#555b59" strokeWidth="6"/><path d="m306 249 33 34m-33-34-28-25" stroke="#a6aaa8" strokeWidth="7"/><path d="m325 283h29m-62-59h-29" stroke="#202621" strokeWidth="10"/><path d="m329 283h4m12 0h4m-80-59h4m12 0h4" stroke="#e7d348" strokeWidth="3"/></g>
  {[{n:1,x:449,y:61},{n:2,x:212,y:59},{n:3,x:306,y:312},{n:4,x:520,y:248}].map(p=><g key={p.n}><circle cx={p.x} cy={p.y} r="12" fill={active===p.n?"#111":"white"} stroke={active===p.n?"#111":"#a7abad"}/><text x={p.x} y={p.y+3.5} textAnchor="middle" fontSize="9" fill={active===p.n?"white":"#666"}>0{p.n}</text></g>)}
 </svg>;
}

export function BikeRepairView({ title = "Rocket youth bike", steps, description = "Assembly guide", footnote = "Illustrative schematic. Follow your bike’s manual for assembly specifications." }: { title?: string; steps?: GuideStepData[]; description?: string; footnote?: string }) {
  return <AssemblyGuideView title={title} description={description} steps={steps ?? repairSteps} footnote={footnote} renderIllustration={steps ? undefined : (current, exploded) => <YouthBike active={current.part ?? 0} exploded={exploded}/>}/>;
}

const refData = <T,>(value: unknown) => value && typeof value === "object" && "props" in value ? value.props as T : value as T;
export const RoomColorPreview = defineComponent({ name: "RoomColorPreview", props: z.object({ title: z.string(), palette: z.array(ColorSwatch.ref).optional(), regions: z.array(ColorRegion.ref).optional(), scene: z.optional(SceneDrawing.ref), description: z.string().optional() }), description: "Living-room preset of RecolorableScene. Optional palette, regions and original scene allow custom interiors. For other objects use RecolorableScene.", component: ({ props }) => <RoomColorPreviewView {...props} palette={props.palette?.map(item => refData<SwatchData>(item))} regions={props.regions?.map(item => refData<RegionData>(item))} scene={props.scene ? drawingData(props.scene) : undefined}/> });
export const OrigamiGuide = defineComponent({ name: "OrigamiGuide", props: z.object({ title: z.string(), steps: z.array(GuideStep.ref).optional(), description: z.string().optional(), level: z.string().optional() }), description: "Origami preset of IllustratedStepGuide. Default is the twelve-step fox; supply GuideSteps and their own illustrations for a different fold. Never change only the title to claim a different model.", component: ({ props }) => <OrigamiGuideView {...props} steps={props.steps ? resolveGuideSteps(props.steps) : undefined}/> });
export const GardenPlanner = defineComponent({ name: "GardenPlanner", props: z.object({ title: z.string(), options: z.array(GridOption.ref).optional(), layouts: z.array(GridLayout.ref).optional(), description: z.string().optional(), footer: z.string().optional() }), description: "Garden preset of EditableGrid. Supply plant GridOptions and any rectangular GridLayouts for a different garden. Defaults to four planters or sixteen squares.", component: ({ props }) => <GardenPlannerView {...props} options={props.options?.map(item => { const option = refData<GridOptionData>(item); return { ...option, illustration: option.illustration ? drawingData(option.illustration) : undefined }; })} layouts={props.layouts?.map(item => refData<GridLayoutData>(item))}/> });
export const BikeRepair = defineComponent({ name: "BikeRepair", props: z.object({ title: z.string(), steps: z.array(GuideStep.ref).optional(), description: z.string().optional(), footnote: z.string().optional() }), description: "Youth bicycle preset of AssemblyGuide. Optional GuideSteps replace instructions and artwork together. Use AssemblyGuide for other objects and supply matching scene illustrations.", component: ({ props }) => <BikeRepairView {...props} steps={props.steps ? resolveGuideSteps(props.steps) : undefined}/> });
export const creativeComponents = { ...creativeCompositionComponents, RoomColorPreview, OrigamiGuide, GardenPlanner, BikeRepair };
