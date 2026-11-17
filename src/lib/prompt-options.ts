import type { PromptOptions } from "@openuidev/react-lang";
import { additionalRules, examples } from "@openuidev/intelligent-ui-library";
import { demoToolSpecs } from "./demo-data";

/**
 * Prompt options that teach the model to answer with working tools: the page
 * holds its inputs and lists in $variables and computes with @functions, so
 * it works without sending anything back to the assistant.
 */

export const exampleShoppingList = `root = Card([title, stepper, list, copy])
$guests = 4
$got = []
title = Title("Pasta night for " + @Plural($guests, "guest"), "lg")
stepper = Row([IconButton("minus", @Set($guests, @Clamp($guests - 1, 1, 20)), "Fewer"), Text($guests + "", "lg", null, "semibold"), IconButton("plus", @Set($guests, @Clamp($guests + 1, 1, 20)), "More")], 3)
lines = @Each(base, "i", {name: i.name, qty: @Round(i.qty * $guests / 4) + i.unit})
list = Col(@Each(lines, "l", Pressable([Row([Icon(@Includes($got, l.name) ? "check-circle" : "circle", "sm"), Text(l.qty + " " + l.name, "sm", null, null, false, @Includes($got, l.name))], 2)], @Set($got, @Toggle($got, l.name)), @Includes($got, l.name), 2)), 1)
copy = Button("Copy list", @CopyToClipboard(@Join(@Each(lines, "l", l.qty + " " + l.name), "\\n")), "outline", null, "sm", "copy")
base = [{name: "spaghetti", qty: 400, unit: " g"}, {name: "tomatoes", qty: 6, unit: ""}, {name: "parmesan", qty: 80, unit: " g"}]`;

export const exampleTrip = `root = Col([title, intro, photos, facts, Title("Day by day", "md"), days, prefs])
$pace = "Relaxed"
title = Title("Three days in Lisbon", "xl")
intro = Text("Hills, tiled facades and the Tagus: start in **Alfama**, give a day to Belém, then take the train to Sintra.")
photos = Carousel([SearchImage("Alfama Lisbon", 1.25), SearchImage("Belém Tower", 1.25), SearchImage("Pena Palace", 1.25)], 260)
facts = Row([Badge("Best in April to June"), Badge("Tram 28", "info"), Badge("About €120 a day", "success")], 2, null, null, true)
days = Col(@Each(plan, "d", Row([Box([SearchImage(d.place, 1, "lg")], null, null, null, null, null, null, 96), Col([Text([Icon("map-pin", "sm"), " Day " + d.day + " · " + d.title], "md", null, "semibold"), Text(d.text, "sm", "muted")], 1)], 4, "start")), 4)
prefs = Card([Title("Make it yours", "sm"), Form([RadioGroup($pace, ["Relaxed", "Packed"], "Pace", "pills"), Button("Plan my trip", @ToAssistant("Tailor my Lisbon trip"))])], "soft")
plan = [{day: 1, title: "Alfama", place: "São Jorge Castle", text: "Climb to the castle, then lunch on grilled sardines."}, {day: 2, title: "Belém", place: "Jerónimos Monastery", text: "The monastery, the tower and pastéis de Belém."}, {day: 3, title: "Sintra", place: "Pena Palace", text: "Train from Rossio; book the palace for 9 AM."}]`;

export const exampleDashboard = `root = Col([head, kpis, Grid([weekly, byRegion], 2, 280, 4), top])
$region = "All"
orders = Query("get_orders", {days: 90}, {rows: []})
rows = $region == "All" ? orders.rows : @Filter(orders.rows, "region", "==", $region)
head = Row([Title("Sales, last 90 days", "lg"), Spacer(), SegmentedControl($region, ["All", "North", "South", "East", "West"])], 3, null, null, true)
kpis = Grid([Card([Caption("Revenue"), Title(@Format(@Sum(rows.amount), "compact", 1, "USD"), "xl")]), Card([Caption("Orders"), Title(@Format(@Count(rows)), "xl")])], 2, 160, 3)
weekly = Card([Title("Revenue by week", "sm"), Chart("line", @Bucket(rows, "date", "week", "amount"), "key", ["value"])])
byRegion = Card([Title("By region", "sm"), Chart("donut", @GroupBy(orders.rows, "region", "amount"), "key", ["value"])])
top = Table(["Product", "Revenue"], @Each(@Top(@GroupBy(rows, "product", "amount"), "value", 5), "p", [p.key, @Format(p.value, "currency")]))`;

/**
 * The library's rules, with the ones about photos, places and media rewritten for
 * this app's SearchImage and Map. Each rule is found by its opening words, so a
 * library update that rewords one fails here instead of dropping it silently.
 */
const appRules: Record<string, string[]> = {
  "Compose the answer like a page": [
    "Compose the answer like a page, not a form letter: a Title, a short Text, then a mix of blocks that show the content. SearchImage for every place, dish, product or thing that has a look (the app finds the photo, so never say you cannot show photos); Row, Grid and Carousel to set things side by side; Badge rows for quick facts; Card only to group a block; Popover for an aside.",
  ],
  "Use Image only with a URL": [
    "Use Image only with a URL the user or a tool gave in this conversation, and never write an image URL yourself. For any other photo use SearchImage, which finds one for its query.",
  ],
  "A photo beside text is a media row": [
    'A photo beside text is a media row: Row([Box([SearchImage(query, 1.33)]), Col([Title(..., "md"), Row([Badge(...), Badge(...)], 1, null, null, true), Text(..., "sm")], 2)], 4, "start"). The app sizes the photo to a third of the row (at most 200px) and top-aligns the text. Facts are Badges, never Buttons or boxed pills.',
    'Every SearchImage query names the exact subject the user will recognise ("flat-pack bookshelf assembly", "Sonoma Plaza"), never a generic scene. If no photo would show the subject, use no image.',
  ],
  "Pick the medium that shows the idea": [
    "Pick the medium that shows the idea: Chart for numbers across time or categories; Svg drawings for shapes, parts and movement; Map with MapMarker for places and routes; Table for comparisons; Flashcard and Celebration for learning and games; HtmlView only for a game or animation that needs a loop.",
  ],
  "Answer a plain knowledge or safety question": [
    "Answer a plain knowledge or safety question with Markdown text, adding a SearchImage or a Quote only where it helps.",
  ],
};

function withAppRules(base: readonly string[]): string[] {
  const unused = new Set(Object.keys(appRules));
  const rules = base.flatMap((rule) => {
    const opening = Object.keys(appRules).find((o) => rule.startsWith(o));
    if (!opening) return [rule];
    unused.delete(opening);
    return appRules[opening]!;
  });
  if (unused.size) throw new Error(`Library rules not found: ${[...unused].join(", ")}`);
  return rules;
}

const rules = withAppRules(additionalRules);

// The library's step-by-step example: a drawing for each step, driven by $step.
const stepsExample = examples.find((e) => e.startsWith("Example 3: Step-by-step"));
if (!stepsExample) throw new Error("Library example not found: Example 3: Step-by-step");
export const exampleSteps = stepsExample.slice(stepsExample.indexOf("root ="));

/** The chat prompt: no tools, $variables and functions. */
export const promptOptions: PromptOptions = {
  bindings: true,
  additionalRules: rules,
  examples: [
    `Example 1: A guest stepper that rescales a shopping list, with a checklist and a copy button:\n\n${exampleShoppingList}`,
    `Example 2: A composed trip answer: photos, facts, day rows and a short form:\n\n${exampleTrip}`,
    stepsExample,
  ],
};

/** For dashboards over the demo data tools: Query rows, shaped with the data functions. */
export const dashboardPromptOptions: PromptOptions = {
  ...promptOptions,
  tools: demoToolSpecs,
  toolExamples: [`Example 4: A live dashboard over Query rows:\n\n${exampleDashboard}`],
  additionalRules: [
    ...rules,
    "Fetch rows with Query and compute every number, group and series from them with @Sum, @Count, @GroupBy, @Bucket, @Top, @Stats and @Change. A filter is a $variable (from this library's Select or SegmentedControl) applied with @Filter; select dates and ranges with @Between, since @Filter's < and > compare numbers only.",
  ],
};
