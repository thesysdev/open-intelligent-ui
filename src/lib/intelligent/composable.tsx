"use client";

import { defineComponent, reactive, useIsStreaming, useStateField } from "@openuidev/react-lang";
import { useId, useState } from "react";
import { z } from "zod/v4";
import { RangeInput } from "./controls";
import { recordProps, safePaint } from "./scene";

export const RangeControl = defineComponent({name:"RangeControl", props:z.object({name:z.string(),label:z.string(),min:z.number(),max:z.number(),step:z.number().positive().optional(),value:reactive(z.number().optional()),unit:z.string().optional()}), description:"Composable scalar slider. Bind value to a $variable to control other components immediately (e.g. ExplodedDiagram.explode, ValueDisplay, Contribution.value). Same visual control as every example.",component:function RangeControlRenderer({props}){
  const field=useStateField(props.name,props.value), disabled=useIsStreaming();
  const low=Number.isFinite(props.min)?props.min:0,high=Number.isFinite(props.max)?props.max:100;
  const min=Math.min(low,high),max=Math.max(low,high);
  const [local,setLocal]=useState(field.value??min);
  const current=field.isReactive?field.value:local;
  const value=Math.max(min,Math.min(max,typeof current==="number"?current:min));
  return <label className="iui-slider-label">{props.label}<strong>{value.toLocaleString()}{props.unit}</strong><RangeInput aria-label={props.label} aria-valuetext={`${value}${props.unit??""}`} min={min} max={max} step={props.step??1} value={value} disabled={disabled} onChange={e=>{setLocal(+e.target.value);if(field.isReactive)field.setValue(+e.target.value);}}/></label>;
}});
export const ChoiceControl = defineComponent({name:"ChoiceControl",props:z.object({name:z.string(),label:z.string(),options:z.array(z.string()).min(1).max(20),value:reactive(z.string().optional())}),description:"A row of choices that reads/writes a shared $variable. Use with ExplodedDiagram.selected or any computed expression. Options must match the target IDs or groups.",component:function ChoiceControlRenderer({props}){
  const field=useStateField(props.name,props.value),disabled=useIsStreaming();
  const [local,setLocal]=useState(field.value??props.options?.[0]);
  return <div className="iui-composed-choices"><span>{props.label}</span><div className="iui-segments" aria-label={props.label}>{(props.options??[]).map(option=><button key={option} disabled={disabled} aria-pressed={(field.isReactive?field.value:local)===option} onClick={()=>{setLocal(option);if(field.isReactive)field.setValue(option);}}>{option}</button>)}</div></div>;
}});
export const ValueDisplay=defineComponent({name:"ValueDisplay",props:z.object({label:z.string(),value:z.number(),prefix:z.string().optional(),suffix:z.string().optional(),decimals:z.number().int().min(0).max(6).optional()}),description:"Live numeric result. value accepts a built-in OpenUI expression such as $quantity * $price; recalculates when inputs change.",component:({props})=><div className="iui-gdp-total" aria-live="polite"><span>{props.label}</span><strong>{props.prefix}{Number.isFinite(props.value)?props.value.toLocaleString(undefined,{minimumFractionDigits:props.decimals??0,maximumFractionDigits:props.decimals??0}):"—"}{props.suffix}</strong></div>});

export type ContributionData={label:string;value:number;color:string;prefix?:string;suffix?:string};
const contributionSchema=z.object({label:z.string(),value:z.number(),color:z.string(),prefix:z.string().optional(),suffix:z.string().optional()});
export const Contribution=defineComponent({name:"Contribution",props:contributionSchema,description:"Labeled contribution to a total. value can be an OpenUI expression or $variable; signed values are supported.",component:()=>null});
export function paintText(color:string){const match=/^#([a-f\d]{6})$/i.exec(color);if(!match)return "#171717";const rgb=[0,2,4].map(i=>parseInt(match[1].slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];return (luminance+.05)/.05 > 1.05/(luminance+.05)?"#171717":"#fff";}
export function ContributionChartView({items,label="Contributions"}:{items:ContributionData[];label?:string}){
  const positive=items.filter(item=>item.value>0),negative=items.filter(item=>item.value<0);
  const format=(item:ContributionData)=>`${item.prefix??""}${Number.isFinite(item.value)?item.value.toLocaleString():"—"}${item.suffix??""}`;
  return <div><div className="iui-gdp-bar" role="img" aria-label={`${label}: ${items.map(item=>`${item.label}: ${format(item)}`).join(", ")}`}>
    {positive.map((item,i)=><span key={i} style={{background:safePaint(item.color,"#3472d5"),flex:item.value,color:paintText(item.color)}}><b>{format(item)}</b></span>)}{!positive.length&&<span style={{background:"#f2f2f2",flex:1}}>No positive contributions</span>}
  </div>{negative.length>0&&<p className="iui-note">Deductions: {negative.map(item=>`${item.label} ${format(item)}`).join(" · ")}. The bar shows positive contributions.</p>}</div>;
}
export const ContributionChart=defineComponent({name:"ContributionChart",props:z.object({items:z.array(Contribution.ref).max(30),label:z.string().optional()}),description:"Proportional stacked bar for any composition: spending, energy, budgets, revenue. Use Contribution children whose values reference shared $variables. Handles deductions separately and keeps labels legible.",component:({props})=><ContributionChartView items={(props.items??[]).filter(Boolean).slice(0,30).map(item=>recordProps(item))} label={props.label}/>});
export const KnowledgeCheck=defineComponent({name:"KnowledgeCheck",props:z.object({question:z.string(),options:z.array(z.string()).min(2).max(8),answer:z.number().int().min(0),explanation:z.string(),value:reactive(z.number().optional())}),description:"A reusable multiple-choice knowledge check. answer is the zero-based correct option index. Optional value can bind to shared state.",component:function KnowledgeCheckRenderer({props}){
  const id=useId(), field=useStateField(`${id}-answer`,props.value),disabled=useIsStreaming();
  const [local,setLocal]=useState(field.value),picked=field.isReactive?field.value:local;
  return <fieldset className="iui-learning-quiz"><legend>{props.question}</legend>{(props.options??[]).map((option,i)=><label key={option}><input type="radio" name={id} disabled={disabled} checked={picked===i} onChange={()=>{setLocal(i);if(field.isReactive)field.setValue(i);}}/>{option}</label>)}{picked!=null&&<p aria-live="polite">{picked===props.answer?"Correct. ":"Not quite. "}{props.explanation}</p>}</fieldset>;
}});
export const composableComponents={RangeControl,ChoiceControl,ValueDisplay,Contribution,ContributionChart,KnowledgeCheck};
