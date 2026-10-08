"use client";

import { defineComponent } from "@openuidev/react-lang";
import { useEffect, useState } from "react";
import { z } from "zod/v4";
import { RetroConsole } from "./retro";
import { RangeInput } from "./controls";

const parts = ["All", "Frame", "Wheels", "Drivetrain", "Brakes", "Cockpit"];
const explanations = [
  ["Five connected systems", "The frame carries the rider; the drivetrain turns effort into motion. Select a system to explore its role."],
  ["A strong foundation", "Two triangles connect the saddle, steering and pedals. The fork holds the front wheel and turns with the handlebars."],
  ["Made to keep rolling", "Spokes connect each hub to its rim and support the rider. Tires provide grip and soften the ride."],
  ["Seven ways to move", "The pedals turn the chain, driving the rear wheel. Seven gears let you adjust your effort for climbs, flats and descents."],
  ["Control at the rim", "Hand levers pull cables that bring the brake pads against the rims, turning a squeeze into controlled slowing."],
  ["Steering and support", "The handlebars and stem steer the front wheel. The saddle and seatpost support you and set your riding position."],
];

export function BicycleExplorerView({ title = "7-speed bicycle" }: { title?: string }) {
  const [part, setPart] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [explode,setExplode] = useState(0);
  const spread = Math.pow(explode / 100, .72);
  const opacity = (n: number) => part === 0 || part === n ? 1 : .13;
  return <section className={`iui-panel iui-bike ${expanded ? "iui-expanded" : ""}`} aria-label={title}>
    <div className="iui-panel-heading"><h2>{title}</h2><button className="iui-icon-button" aria-label={expanded ? "Collapse bicycle" : "Expand bicycle"} onClick={() => setExpanded(!expanded)}>{expanded ? "↙" : "↗"}</button></div>
    <div className="iui-bike-canvas">
      <svg viewBox="-35 -75 830 470" role="img" aria-label={`Side view of a seven-speed bicycle. ${parts[part]} highlighted.`}>
        <defs><linearGradient id="bike-metal"><stop stopColor="#bec8bf"/><stop offset=".5" stopColor="#e0e6da"/><stop offset="1" stopColor="#a5b2a6"/></linearGradient></defs>
        <ellipse cx="385" cy="331" rx="291" ry="12" fill="#000" opacity={.035*(1-spread)}/>
        <g style={{opacity:opacity(2)}}>{[183,570].map(cx => <g key={cx} data-bike-part={cx===183?"rear-wheel":"front-wheel"} transform={`translate(${(cx===183?-75:75)*spread} ${40*spread})`}><g transform={`rotate(${rotation} ${cx} 233)`}><circle cx={cx} cy="233" r="98" fill="none" stroke="#292c2b" strokeWidth="13"/><circle cx={cx} cy="233" r="87" fill="none" stroke="#b7bbb7" strokeWidth="3"/>{Array.from({length:24},(_,i)=> {const a=i*Math.PI/12;return <line key={i} x1={cx} y1="233" x2={(cx+86*Math.cos(a)).toFixed(3)} y2={(233+86*Math.sin(a)).toFixed(3)} stroke="#aeb2ae" strokeWidth="1"/>})}<circle cx={cx} cy="233" r="8" fill="#666c67"/></g></g>)}</g>
        <g style={{opacity:opacity(1)}} fill="none" stroke="url(#bike-metal)" strokeWidth="13" strokeLinejoin="round"><path d="M183 233 315 112 370 242 183 233 277 137 479 137 370 242"/><path d="m315 112 169-8 86 129"/><path d="m479 137 5-33"/></g>
        <g data-bike-part="brakes" style={{opacity:opacity(4)}} transform={`translate(${40*spread} ${-60*spread})`} fill="none" stroke="#323937" strokeWidth="3"><path d="M523 75 C456 93 542 88 532 162 M512 80 C483 149 271 63 250 165"/><path d="m519 145 20 8m-282-5-18 11" strokeWidth="7"/></g>
        <g data-bike-part="drivetrain" style={{opacity:opacity(3)}} transform={`translate(${100*spread} ${80*spread})`}><path d="M183 219 369 221 Q396 242 369 263 L183 245 Z" fill="none" stroke="#59615b" strokeWidth="4"/><circle cx="370" cy="242" r="25" fill="#cbd0c9" stroke="#777f77" strokeWidth="6"/><circle cx="183" cy="233" r="14" fill="#747b74"/>
          <g transform={`rotate(${rotation} 370 242)`}><path d="m347 218 45 49" stroke="#4d554d" strokeWidth="8"/><path d="m331 219 29-1m19 48 28-1" stroke="#222" strokeWidth="9"/></g></g>
        <g data-bike-part="cockpit" style={{opacity:opacity(5)}} transform={`translate(0 ${-105*spread})`} fill="none" stroke="#404640" strokeWidth="8" strokeLinecap="round"><path d="m304 129-14-49m195 23 1-48 30 1 17 21"/><path d="m267 79 53-1" strokeWidth="16"/><path d="m514 54 11 24" strokeWidth="11"/></g>
      </svg>
    </div>
    <label className="iui-slider-label iui-bike-assembly">Explore the assembly<strong>{explode ? `${explode}% exploded` : "Assembled"}</strong><RangeInput aria-label="Explode bicycle parts" aria-valuetext={`${explode}% exploded`} min="0" max="100" value={explode} onChange={e=>setExplode(+e.target.value)}/></label>
    <div className="iui-segments" aria-label="Bicycle systems">{parts.map((p, i) => <button key={p} aria-pressed={part === i} onClick={() => setPart(i)}>{p}</button>)}</div>
    <div className="iui-bike-caption"><div><h3>{explanations[part][0]}</h3><p>{explanations[part][1]}</p></div><button className="iui-button" onClick={()=>setRotation(r=>r+90)}>Turn the pedals <span>↻</span></button></div>
  </section>;
}

// Exact bin probabilities for the populations used by the sampler below.
export function populationBinMass(distribution: string, index: number, count = 30) {
  const low = index / count;
  const high = (index + 1) / count;
  if (distribution === "Uniform") return high - low;
  if (distribution === "Skewed") return Math.cbrt(high) - Math.cbrt(low);
  const overlap = (start: number, end: number) => Math.max(0, Math.min(high, end) - Math.max(low, start));
  return .5 * (overlap(.05, .25) + overlap(.75, .95)) / .2;
}

export function DistributionExplorerView({title="The central limit theorem"}:{title?:string}) {
  const [size,setSize]=useState(5); const [distribution,setDistribution]=useState("Skewed");
  const [means,setMeans]=useState<number[]>([]); const [running,setRunning]=useState(false);
  const sample=()=>{let sum=0;for(let i=0;i<size;i++){const r=Math.random();sum+=distribution==="Uniform"?r:distribution==="Bimodal"?(r<.5?.15:.85)+(Math.random()-.5)*.2:Math.pow(r,3);}return sum/size;};
  useEffect(()=>{if(!running)return;const id=setInterval(()=>setMeans(old=>[...old,...Array.from({length:20},sample)].slice(-6000)),120);return()=>clearInterval(id);},[running,size,distribution]); // eslint-disable-line react-hooks/exhaustive-deps
  const bins=Array.from({length:30},(_,i)=>means.filter(v=>Math.min(29,Math.floor(v*30))===i).length);
  const populationBins=Array.from({length:30},(_,i)=>populationBinMass(distribution,i));
  const populationMax=Math.max(...populationBins);
  const max=Math.max(1,...bins); const mean=means.length?means.reduce((a,b)=>a+b,0)/means.length:0;
  const reset=()=>{setMeans([]);setRunning(false);};
  return <section className="iui-panel iui-learning"><div className="iui-panel-heading"><div><h2>{title}</h2><p className="iui-muted">Different populations. The same bell-shaped pattern.</p></div></div>
    <div className="iui-segments" aria-label="Population distribution">{["Skewed","Uniform","Bimodal"].map(d=><button key={d} aria-pressed={distribution===d} onClick={()=>{setDistribution(d);reset();}}>{d}</button>)}</div>
    <div className="iui-chart-pair"><div><h3>Population</h3><p className="iui-muted">The values we draw from</p><svg viewBox="0 0 300 160" role="img" aria-label={`${distribution} population distribution`}>{populationBins.map((mass,i)=>{const h=mass/populationMax*120;return <rect key={i} x={i*9.2+12} y={(140-h).toFixed(3)} width="7" height={h.toFixed(3)} rx="2" fill="#d7a05c"/>})}<path d="M10 141H292" stroke="#ddd"/></svg></div>
    <div><h3>Sample means</h3><p className="iui-muted">The average of each sample</p><svg viewBox="0 0 300 160" role="img" aria-label={`${means.length} sample means histogram`}>{bins.map((b,i)=><rect key={i} x={i*9.2+12} y={140-b/max*120} width="7" height={b/max*120} rx="2" fill="#4fa98e"/>)}<path d="M10 141H292" stroke="#ddd"/>{!means.length&&<text x="150" y="80" textAnchor="middle" fill="#888" fontSize="12">Draw samples to see the pattern</text>}</svg></div></div>
    <label className="iui-slider-label">Sample size <strong>{size}</strong><RangeInput aria-label="Sample size" min="1" max="100" value={size} onChange={e=>{setSize(+e.target.value);reset();}}/></label>
    <div className="iui-action-row"><button className="iui-button iui-primary" onClick={()=>setRunning(!running)}>{running?"Pause":"▶ Run simulation"}</button><button className="iui-button" onClick={()=>setMeans(old=>[...old,...Array.from({length:100},sample)].slice(-6000))}>Add 100 samples</button><button className="iui-text-button" onClick={reset}>Reset</button></div>
    <div className="iui-stat-row" aria-live="polite"><span><strong>{means.length.toLocaleString()}</strong> samples</span><span><strong>{mean.toFixed(3)}</strong> mean</span><span><strong>{size}</strong> values per sample</span></div>
    <p className="iui-note">As sample size grows, the distribution of sample means approaches a normal distribution—even when the original population is skewed.</p>
    <KnowledgeCheck question="What changes when the sample size grows?" options={["The original population becomes normal", "The sample averages form a narrower bell shape", "Every average becomes exactly the same"]} answer={1} explanation="The population stays the same. The distribution of sample means becomes more normal, and its spread decreases."/>
  </section>;
}

export function EconomyExplorerView({title="What makes up GDP?"}:{title?:string}) {
 const [values,setValues]=useState([600,200,170,30]); const labels=["Consumer spending","Business investment","Government spending","Net exports"];
 const colors=["#3472d5","#128169","#946d00","#b69bd2"];const total=values.reduce((a,b)=>a+b,0); const gross=values.reduce((a,b)=>a+Math.max(0,b),0);
 return <section className="iui-panel iui-learning"><div className="iui-panel-heading"><div><h2>{title}</h2><p className="iui-muted">An economy, in four parts.</p></div><span className="iui-tag">Illustrative economy</span></div><div className="iui-gdp-total"><span>Total output</span><strong>${(total/1000).toFixed(2)} trillion</strong></div>
 <div className="iui-gdp-bar" role="img" aria-label={labels.map((l,i)=>`${l}: ${values[i]} billion`).join(", ")}>{values.map((v,i)=>v>0&&<span key={i} style={{background:colors[i],flex:v,color:i<3?"#fff":"#21182e"}}><b>${v}B</b></span>)}{!gross&&<span style={{background:"#f2f2f2",flex:1}}>No positive contributions</span>}</div>
 {values[3]<0&&<p className="iui-note" style={{marginTop:-12,marginBottom:20}}>Positive contributions: ${gross}B. Net imports subtract ${Math.abs(values[3])}B, leaving ${total}B of net output.</p>}
 <div className="iui-gdp-controls">{labels.map((l,i)=><label key={l} className="iui-slider-label"><span><i style={{background:colors[i]}}/>{l}</span><strong>${values[i]}B</strong><RangeInput aria-label={l} min={i===3?-200:0} max={i===0?1200:500} step="10" value={values[i]} onChange={e=>setValues(old=>old.map((v,j)=>i===j?+e.target.value:v))}/></label>)}</div>
 <button className="iui-text-button" onClick={()=>setValues([600,200,170,30])}>↻ Reset economy</button><div className="iui-equation">GDP = <span>C</span> + <span>I</span> + <span>G</span> + <span>(X − M)</span></div><p className="iui-note">GDP counts the value of final goods and services produced within a country. Imports are subtracted because they were produced elsewhere. Move a slider to see the effect.</p><KnowledgeCheck question="The same goods cost 10% more this year. What changes?" options={["Real GDP increases by 10%", "Nominal GDP rises; real GDP is unchanged", "Both measures stay the same"]} answer={1} explanation="Real GDP adjusts for price changes. Higher prices alone raise nominal GDP, but not real output."/></section>;
}

export function DroneExplorerView({title="Find a new perspective"}:{title?:string}) {
 const [angle,setAngle]=useState(45);const [height,setHeight]=useState(60);const [grid,setGrid]=useState(true);
 return <section className="iui-panel iui-learning"><div className="iui-panel-heading"><div><h2>{title}</h2><p className="iui-muted">Explore how altitude and camera angle change your shot.</p></div></div><div className="iui-drone-scene"><svg viewBox="0 0 640 330" role="img" aria-label={`Simulated drone view from ${height} metres at ${angle} degrees`}>
 <defs><linearGradient id="drone-sky" x2="0" y2="1"><stop stopColor="#cce1eb"/><stop offset="1" stopColor="#eef2ed"/></linearGradient><linearGradient id="drone-water" x2="0" y2="1"><stop stopColor="#9dbcbc"/><stop offset="1" stopColor="#5b989a"/></linearGradient></defs><rect width="640" height="330" fill="url(#drone-sky)"/><g transform={`translate(320 ${80-angle*.7}) scale(${1.4-height/220}) translate(-320 0)`}><path d="M-200 220 95 55 232 154 394 50 790 231V600H-200Z" fill="#9ba89a"/><path d="M-200 285 130 122 243 211 451 106 840 250V600H-200Z" fill="#b2b7a0"/><path d="M-200 305 190 209 455 184 840 330V600H-200Z" fill="#c8c3a6"/><path d="M340 204C180 248 440 280 245 410H680V208Z" fill="url(#drone-water)"/><path d="M331 207C183 251 433 280 234 410" fill="none" stroke="#e8dcc5" strokeWidth="12"/><path d="M80 360 205 246 319 217" stroke="#efede3" strokeWidth="5" fill="none"/>{[0,1,2,3,4,5,6,7].map(i=><path key={i} d={`M${130+i*18} ${245-i*4}l-8 22h16z`} fill="#768873"/>)}</g>{grid&&<g stroke="#fff" opacity=".65" strokeWidth="1"><path d="M213 0V330M426 0V330M0 110H640M0 220H640"/></g>}<rect x="18" y="18" width="66" height="26" rx="13" fill="#fff" opacity=".9"/><text x="51" y="35" textAnchor="middle" fontSize="11" fill="#444">Preview</text></svg></div>
 <div className="iui-drone-controls"><label className="iui-slider-label">Camera tilt<strong>{angle}°</strong><RangeInput aria-label="Camera tilt" min="0" max="90" value={angle} onChange={e=>setAngle(+e.target.value)}/></label><label className="iui-slider-label">Altitude<strong>{height} m</strong><RangeInput aria-label="Drone altitude" min="20" max="120" value={height} onChange={e=>setHeight(+e.target.value)}/></label></div>
 <div className="iui-action-row"><button className="iui-button" aria-pressed={grid} onClick={()=>setGrid(!grid)}>{grid?"Hide":"Show"} thirds grid</button><span className="iui-muted">{angle>65?"Top-down · patterns and shapes":angle<25?"Low angle · depth and horizon":"Oblique · a balanced view"}</span></div><p className="iui-note">A simplified composition preview. Use the grid to place your subject off-center and make room for the landscape.</p></section>;
}

export function MontyHallView({title="Should you switch doors?"}:{title?:string}) {
 const [prize,setPrize]=useState(0);const [choice,setChoice]=useState<number|null>(null);const [opened,setOpened]=useState<number|null>(null);const [result,setResult]=useState<number|null>(null);const [stats,setStats]=useState({stay:0,switch:0,games:0});
 const pick=(i:number)=>{if(choice!==null)return;setChoice(i);const draw=crypto.getRandomValues(new Uint32Array(1))[0]%3;setPrize(draw);const options=[0,1,2].filter(d=>d!==i&&d!==draw);setOpened(options[crypto.getRandomValues(new Uint32Array(1))[0]%options.length]);};
 const finish=(change:boolean)=>{if(choice===null||opened===null)return;setResult(change?[0,1,2].find(d=>d!==choice&&d!==opened)!:choice);};
 const reset=()=>{setPrize(0);setChoice(null);setOpened(null);setResult(null);};
 const simulate=()=>{let stay=0;for(let i=0;i<1000;i++)if(Math.floor(Math.random()*3)===Math.floor(Math.random()*3))stay++;setStats(s=>({stay:s.stay+stay,switch:s.switch+1000-stay,games:s.games+1000}));};
 return <section className="iui-panel iui-learning"><div className="iui-panel-heading"><div><h2>{title}</h2><p className="iui-muted">One car. Two goats. A surprisingly good reason to switch.</p></div></div><div className="iui-doors">{[0,1,2].map(i=><button key={i} aria-label={`Door ${i+1}${choice===i?", selected":""}${opened===i?", revealed goat":""}`} disabled={choice!==null} className={`${choice===i?"selected":""} ${opened===i||result!==null?"revealed":""}`} onClick={()=>pick(i)}><span className="iui-door-number">{i+1}</span><span className="iui-door-content">{opened===i||result!==null?i===prize?"🚗":"🐐":""}</span><i/>{choice===i&&<span className="iui-door-choice">Your pick</span>}</button>)}</div>
 <div className="iui-monty-status" aria-live="polite">{result!==null?<><h3>{result===prize?"You found the car!":"A goat this time."}</h3><p>Switching wins whenever your first choice was a goat: 2 out of 3 possibilities.</p></>:choice!==null?<><h3>Door {opened!+1} has a goat.</h3><p>Your first door still has a ⅓ chance. The other closed door has a ⅔ chance.</p></>:<><h3>Start by choosing a door.</h3><p>The host knows where the car is and will reveal a goat behind another door.</p></>}</div>
 <div className="iui-action-row">{result!==null?<button className="iui-button iui-primary" onClick={reset}>Play again</button>:choice!==null?<><button className="iui-button iui-primary" onClick={()=>finish(true)}>Switch doors</button><button className="iui-button" onClick={()=>finish(false)}>Keep my door</button></>:null}<button className="iui-button" onClick={simulate}>Simulate 1,000 games</button></div>
 {stats.games>0&&<div className="iui-simulation-result" aria-live="polite"><div><span>Stay</span><div><i style={{width:`${stats.stay/stats.games*100}%`,background:"#c8b5dd"}}/></div><strong>{(stats.stay/stats.games*100).toFixed(1)}%</strong></div><div><span>Switch</span><div><i style={{width:`${stats.switch/stats.games*100}%`,background:"#9dbba4"}}/></div><strong>{(stats.switch/stats.games*100).toFixed(1)}%</strong></div><small>{stats.games.toLocaleString()} simulated games</small></div>}</section>;
}

function KnowledgeCheck({question,options,answer,explanation}:{question:string;options:string[];answer:number;explanation:string}) {
 const [picked,setPicked]=useState<number|null>(null);
 return <fieldset className="iui-learning-quiz"><legend>{question}</legend>{options.map((o,i)=><label key={o}><input type="radio" checked={picked===i} onChange={()=>setPicked(i)}/>{o}</label>)}{picked!==null&&<p aria-live="polite">{picked===answer?"Correct. ":"Not quite. "}{explanation}</p>}</fieldset>;
}

export function DroneMarketView({title="Understanding the drone photography market"}:{title?:string}) {
 const [shoots,setShoots]=useState(12);const [price,setPrice]=useState(250);const [clients,setClients]=useState(3);const [retainer,setRetainer]=useState(1500);
 return <section className="iui-panel iui-learning"><div className="iui-panel-heading"><div><h2>{title}</h2><p className="iui-muted">Three markets. Different customers, different business models.</p></div></div><div className="iui-market-photos">{[
  ["Creative","Real estate, weddings, tourism","photo-1470770841072-f978cf4d019e"],
  ["Commercial","Construction, surveying, agriculture","photo-1503387762-592deb58ef4e"],
  ["Industrial","Inspections and infrastructure","photo-1506947411487-a56738267384"],
 ].map(([name,desc,img])=><div key={name}><img src={`https://images.unsplash.com/${img}?auto=format&fit=crop&w=500&q=80`} alt={name+" aerial photography"}/><h3>{name}</h3><p>{desc}</p></div>)}</div><div className="iui-market-stats"><div><span>Photography services · reference demo estimate</span><strong>$617M</strong><span>2025, U.S. · narrow market definition</span></div><div><span>Commercial drones · reference demo estimate</span><strong>$4.1B</strong><span>2024, U.S. · broader market definition</span></div></div><h3>Explore a growth scenario</h3><p className="iui-muted">Illustrative revenue path, not a market forecast</p><svg className="iui-market-chart" viewBox="0 0 640 210" role="img" aria-label="Illustrative growth chart from 0.6 to 3.8 billion dollars">{[0,1,2,3,4].map(v=><g key={v}><path d={`M45 ${170-v*36}H630`} stroke="#ececec"/><text x="30" y={174-v*36} textAnchor="end" fontSize="10" fill="#888">${v}B</text></g>)}{[.617,1,1.8,3.8].map((v,i)=><g key={i}><rect x={65+i*146} y={170-v*36} width="100" height={v*36} rx="5" fill="#81c987"/><text x={115+i*146} y="194" textAnchor="middle" fontSize="11" fill="#777">{[2025,2027,2030,2034][i]}</text></g>)}</svg><h3>Where does the money go?</h3><div className="iui-market-stats"><div><span>Real estate · monthly revenue</span><strong>${(shoots*price).toLocaleString()}</strong></div><div><span>Recurring work · monthly revenue</span><strong>${(clients*retainer).toLocaleString()}</strong></div></div><div className="iui-gdp-controls">{[["Shoots per month",shoots,setShoots,50],["Price per shoot",price,setPrice,1000],["Construction clients",clients,setClients,12],["Monthly retainer",retainer,setRetainer,5000]].map(([label,value,setter,max])=><label className="iui-slider-label" key={String(label)}>{String(label)}<strong>{Number(value).toLocaleString()}</strong><RangeInput aria-label={String(label)} min="0" max={Number(max)} value={Number(value)} onChange={e=>(setter as (v:number)=>void)(+e.target.value)}/></label>)}</div><table className="iui-market-table"><thead><tr><th>Customer</th><th>What they buy</th><th>Typical relationship</th></tr></thead><tbody><tr><td>Real estate agents</td><td>Listing photos and video</td><td>Frequent, smaller jobs</td></tr><tr><td>Construction firms</td><td>Progress tracking</td><td>Recurring contracts</td></tr><tr><td>Infrastructure owners</td><td>Inspection imagery</td><td>Specialist work</td></tr></tbody></table><p className="iui-note">Market figures recreate the launch demo’s example and are not independently verified estimates. Revenue calculations are hypothetical and exclude expenses.</p></section>;
}

const titleSchema=z.object({title:z.string()});
export const BicycleExplorer=defineComponent({name:"BicycleExplorer",props:titleSchema.clone(),description:"Interactive side-view seven-speed bicycle with selectable Frame, Wheels, Drivetrain, Brakes and Cockpit systems, explanations and moving pedals. Use for explaining bicycle mechanics.",component:({props})=><BicycleExplorerView {...props}/>});
export const DistributionExplorer=defineComponent({name:"DistributionExplorer",props:titleSchema.clone(),description:"Interactive central limit theorem simulation with sample size, population distributions, live histograms and sampling controls. Use for explaining statistics and the CLT.",component:({props})=><DistributionExplorerView {...props}/>});
export const EconomyExplorer=defineComponent({name:"EconomyExplorer",props:titleSchema.clone(),description:"Interactive GDP explainer with adjustable consumer spending, investment, government spending and net exports. Values are illustrative, not current economic data.",component:({props})=><EconomyExplorerView {...props}/>});
export const DroneExplorer=defineComponent({name:"DroneExplorer",props:titleSchema.clone(),description:"Interactive drone photography composition explainer: camera tilt, altitude, illustrated landscape and thirds grid.",component:({props})=><DroneExplorerView {...props}/>});
export const MontyHall=defineComponent({name:"MontyHall",props:titleSchema.clone(),description:"Playable Monty Hall probability demonstration. Pick one of three doors, switch or stay, and simulate 1000 games.",component:({props})=><MontyHallView {...props}/>});
export const RetroGame = RetroConsole;
export const DroneMarket=defineComponent({name:"DroneMarket",props:titleSchema.clone(),description:"Interactive drone photography market overview with photo categories, illustrative growth chart, comparison KPIs, revenue sliders and business table. Example figures are not live market data.",component:({props})=><DroneMarketView {...props}/>});
export const learningComponents={BicycleExplorer,DistributionExplorer,EconomyExplorer,DroneExplorer,DroneMarket,MontyHall,RetroGame};
