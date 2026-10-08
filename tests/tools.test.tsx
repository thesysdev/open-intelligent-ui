import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createLibrary, defineComponent, createParser, Renderer } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { toolComponents, RecipePlannerView, WardrobePlannerView } from "../src/lib/intelligent/tools";
import { allocateCents, currencyPrecision, projectSavings, scaleIngredient, buildPackingList, toolConfigurationKey } from "../src/lib/intelligent/tools-models";

assert.deepEqual(allocateCents(100, [1, 1, 1]), [34, 33, 33]);
assert.deepEqual(allocateCents(101, [1, 0, 2]), [34, 0, 67]);
assert.deepEqual(allocateCents(5, [-1, NaN, 1]), [0, 0, 5]);
for (let amount = 0; amount < 200; amount++) assert.equal(allocateCents(amount, [1, 2, 7]).reduce((a, b) => a + b, 0), amount);
assert.equal(currencyPrecision("JPY"), 0);
assert.equal(currencyPrecision("KWD"), 3);
assert.equal(currencyPrecision("USD"), 2);
assert.equal(projectSavings(1000, 100, 1, 0).at(-1)!.balance, 2200);
assert.ok(projectSavings(1000, 100, 1, 5, "start").at(-1)!.balance > projectSavings(1000, 100, 1, 5).at(-1)!.balance);
assert.equal(projectSavings(0, 100, 2, 0, "end", 10).at(-1)!.contributed, 2520);
assert.ok(projectSavings(1000, 0, 1, -10).at(-1)!.balance < 1000);
assert.equal(scaleIngredient({ name: "Cups", quantity: 1.5, unit: "cups", scaling: "proportional" }, 3, 2), 2.25);
assert.equal(scaleIngredient({ name: "Eggs", quantity: 3, unit: "", scaling: "whole" }, 3, 2), 5);
assert.equal(scaleIngredient({ name: "Salt", quantity: 1, unit: "pinch", scaling: "fixed" }, 8, 2), 1);
assert.deepEqual(buildPackingList(["dress", "hat", "coat"], ["dress", "missing"], [{ weather: "Sunny", includeItemIds: ["hat", "missing"], excludeItemIds: ["coat"], note: "Add sun protection." }], "Sunny"), { ids: ["dress", "hat"], note: "Add sun protection." });

const recipeConfig = { title: "Rice bowl", guests: 2, ingredients: [{ name: "Rice", quantity: 200, unit: "g" }], steps: [{title:"Cook rice"}] };
assert.equal(toolConfigurationKey(recipeConfig, ["guests"]), toolConfigurationKey({...recipeConfig,guests:6}, ["guests"]), "Changing bound guests must preserve the active tab and cooking progress.");
assert.notEqual(toolConfigurationKey(recipeConfig, ["guests"]), toolConfigurationKey({...recipeConfig,ingredients:[{name:"Pasta",quantity:200,unit:"g"}]}, ["guests"]), "A different dataset must reset cooking progress.");
assert.notEqual(toolConfigurationKey(recipeConfig), toolConfigurationKey({...recipeConfig,guests:6}), "A newly configured unbound initial guest count must still reset.");
assert.equal(toolConfigurationKey({title:"Savings",monthlyContribution:100,annualReturn:5},["monthlyContribution","annualReturn"]), toolConfigurationKey({title:"Savings",monthlyContribution:200,annualReturn:8},["monthlyContribution","annualReturn"]), "Bound savings changes must preserve the expanded chart.");
assert.equal(toolConfigurationKey({title:"Bill",people:["A","B"],taxPercent:5,tipPercent:15},["taxPercent","tipPercent"]), toolConfigurationKey({title:"Bill",people:["A","B"],taxPercent:8,tipPercent:20},["taxPercent","tipPercent"]), "Bound tax/tip changes must preserve edited items and participants.");

const Root = defineComponent({ name: "ToolTestRoot", description: "Tools smoke test root", props: z.object({ children: z.array(z.union(Object.values(toolComponents).map((component) => component.ref))) }), component: ({props, renderNode}) => <div>{renderNode(props.children)}</div> });
const library = createLibrary({ root: "ToolTestRoot", components: [Root, ...Object.values(toolComponents)] });
const parser = createParser(library.toJSONSchema());
const cases = [
  { name: "Japanese trip bill", expected: ["Tokyo weekend", "Hotel", "¥10,001"], absent: ["Burrata"], response: `root = ToolTestRoot([bill])\na = BillLineItem("Hotel", 10001, [0,1,2])\nbill = BillSplitter("Tokyo weekend", "JPY", ["Aki","Bo","Cam"], [a], 0, 0, "Split our shared costs", "equal")` },
  { name: "Vegetarian meal", expected: ["Vegetable ramen", "Noodles", "400 g"], absent: ["lamb", "Sunday roast"], response: `root = ToolTestRoot([meal])\ning = RecipeIngredient("Noodles", 200, "g", "proportional")\nstep = RecipeStep("Before serving", "Boil noodles", "Cook to package directions.")\ndish = MenuDish("Vegetable ramen", "A warming noodle bowl.", "")\nmeal = RecipePlanner("Vegetable ramen", "A vegetarian dinner", 2, [ing], [step], [dish], 4)` },
  { name: "Custom summer wardrobe", expected: ["Summer weekend", "Linen dress", "Beach day"], absent: ["Oxford", "Straight-leg"], response: `root = ToolTestRoot([wardrobe])\ndress = WardrobePiece("dress", "Linen dress", "Dresses", "#f3c9b9", "dress")\nhat = WardrobePiece("hat", "Wide-brim hat", "Accessories", "#b89b6d", "hat")\nlook = WardrobeOutfit("Beach day", "Beach", ["dress","hat"])\nrule = PackingRule("Sunny", ["hat"], [], "Bring sun protection.")\nwardrobe = WardrobePlanner("Summer weekend", "A light two-piece capsule", [dress,hat], [look], ["Sunny","Rainy"], [2,4,9], "Sunny", 4, [rule])` },
  { name: "Negative growth", expected: ["Emergency fund", "potential losses", "€"], absent: ["Retirement"], response: `root = ToolTestRoot([SavingsCalculator("Emergency fund", "EUR", 1000, 0, 5, -2, "Explore a downside scenario", "start", 0)])` },
  { name: "Skipped optional savings arguments", expected: ["$2,520", "increasing 10% each year"], absent: ["potential losses"], response: `root = ToolTestRoot([SavingsCalculator("Growing deposits", "USD", 0, 100, 2, 0, null, null, 10)])` },
  { name: "Skipped optional wardrobe arguments", expected: ["Travel wardrobe", "Sun hat", "7 days"], absent: ["Oxford", "Saturday"], response: `root = ToolTestRoot([wardrobe])\nhat = WardrobePiece("hat", "Sun hat", "Accessories", "#b89b6d", "hat", null)\nwardrobe = WardrobePlanner("Travel wardrobe", "Pack lightly", [hat], [], null, null, null, 7, null)` },
];
for (const test of cases) {
  const parsed = parser.parse(test.response);
  assert.deepEqual(parsed.meta.errors ?? [], [], test.name);
  assert.ok(parsed.root, test.name);
  const html = renderToString(createElement(Renderer, { library, response: test.response })).replace(/<!--.*?-->/g, "");
  for (const text of test.expected) assert.ok(html.includes(text), `${test.name}: ${text}`);
  for (const text of test.absent) assert.ok(!html.includes(text), `${test.name} unexpectedly includes ${text}`);
  console.log(`PASS ${test.name}: real OpenUI refs parsed and rendered`);
}

const recipe = renderToString(<RecipePlannerView title="A new menu" ingredients={[{ name: "Rice", quantity: 200, unit: "g" }]} />);
assert.ok(!recipe.includes("Rosemary"), "A custom partial menu must not inherit roast dishes.");
const wardrobe = renderToString(<WardrobePlannerView items={[{ id: "hat", name: "Hat", kind: "hat", category: "Accessories", color: "#aaaaaa" }]} />);
assert.ok(!wardrobe.includes("Saturday"), "A custom wardrobe must not inherit preset outfits.");
console.log("PASS allocation, currency precision, savings scenarios, ingredient scaling, rule filtering and preset isolation");
