"use client";

import { useCallback, useState } from "react";
import { Renderer, type ActionEvent } from "@openuidev/react-lang";
import { Label, SwitchGroup, SwitchItem, ThemeProvider } from "@openuidev/react-ui";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";

export const primitiveInventory = Object.keys(openuiChatLibrary.components);
export const primitiveCount = primitiveInventory.length;

const bridge = "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Golden_Gate_Bridge_as_seen_from_Battery_East.jpg/330px-Golden_Gate_Bridge_as_seen_from_Battery_East.jpg";
const island = "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Alcatraz_2021.jpg/330px-Alcatraz_2021.jpg";
const action = '{ type: "continue_conversation", context: "Preview action" }';

type Example = { title: string; components: string[]; code: string };
type Family = { id: string; label: string; description: string; examples: Example[] };

export const primitiveFamilies: Family[] = [
  { id: "essentials", label: "Essentials", description: "Clear text, quiet surfaces, and familiar actions.", examples: [
    { title: "Text & hierarchy", components: ["Card", "CardHeader", "TextContent", "InlineHeader", "MarkDownRenderer", "Separator", "CodeBlock"], code: `root = Card([CardHeader("A little clarity goes a long way", "Typography that keeps the answer easy to read."), TextContent("The best interface brings the useful details forward. This is a regular body paragraph, with **emphasis where it matters**."), InlineHeader("A smaller heading", "Supporting details have their own place."), MarkDownRenderer("- A comfortable reading size\\n- Calm, consistent spacing\\n- A clear path to the next step"), Separator(), CodeBlock("javascript", "const answer = await openui.generate(prompt);")])` },
    { title: "Buttons & tags", components: ["Button", "Buttons", "IconButton", "Icon", "Tag", "TagBlock"], code: `root = Card([Buttons([Button("Try primary", ${action}, "primary"), Button("Try secondary", ${action}, "secondary"), Button("Try text button", ${action}, "tertiary")]), IconButton("Preview favorite", Icon("heart", "shapes"), ${action}, "secondary", "medium", "circle"), TagBlock(["Design", "Research", "Product"]), Tag("Available", null, "sm", "success"), Tag("In progress", null, "sm", "info"), Tag("Needs review", null, "sm", "warning")])` },
    { title: "Callouts", components: ["Callout", "TextCallout"], code: `root = Card([Callout("neutral", "Good to know", "Small pieces of context fit naturally beside the answer."), Callout("info", "A useful detail", "Supporting information stays distinct without overwhelming the page."), Callout("success", "All set", "A clear confirmation for a completed action."), Callout("warning", "Check this first", "Use a warning when a detail needs attention."), TextCallout("neutral", "A thought to keep", "Choose the simplest interaction that helps someone finish their task.")])` },
  ] },
  { id: "cards", label: "Cards", description: "A shared visual language for compact facts, summaries, and rich results.", examples: [
    { title: "Facts & metrics", components: ["SnippetCardBlock", "SnippetCardItem", "OverviewCardBlock", "OverviewCardItem", "IconText", "BoldText", "Text", "MetricIndicatorInline", "MetricIndicatorWithStrikethrough"], code: `root = Card([SnippetCardBlock([fact1, fact2]), OverviewCardBlock([metric1, metric2])])
fact1 = SnippetCardItem("location", IconText(Icon("map-pin", "travel"), "neutral", "m", "Location", "California", false, "horizontal"), BoldText("text", "San Francisco"))
fact2 = SnippetCardItem("time", IconText(Icon("clock", "time"), "neutral", "m", "Duration", "At your own pace", false, "horizontal"), Text("text", "One day"))
metric1 = OverviewCardItem("distance", Text("text", "Walking distance"), MetricIndicatorInline("6.4 km", "Across the city"))
metric2 = OverviewCardItem("price", Text("text", "Day pass"), MetricIndicatorWithStrikethrough("$24", "Illustrative price", "$30"))` },
    { title: "Context cards", components: ["ContextCardBlock", "ContextCardItem"], code: `root = Card([ContextCardBlock([ContextCardItem("morning", "A slow morning", "Start with coffee, a neighborhood walk, and room for a detour.", "gray"), ContextCardItem("afternoon", "By the water", "Make time for the waterfront and a different view of the city.", "gray")], "grid", true, ${action})])` },
    { title: "Rich cards", components: ["CompositeCardBlock", "CompositeCardItem", "ImageText", "ImageTextLarge"], code: `root = Card([CompositeCardBlock([first, second], "grid", true)])
first = CompositeCardItem("bridge", ImageText("${bridge}", "Golden Gate Bridge", "Golden Gate Bridge", "San Francisco", true, "horizontal"), [Text("text", "Walk toward the Pacific and take in the bay.")], { button: Button("Explore this preview", ${action}, "secondary") })
second = CompositeCardItem("island", ImageTextLarge("${island}", "Alcatraz Island", "Alcatraz Island", "In the bay", true), [Text("text", "An island with layers of history to discover.")], { button: Button("Explore this preview", ${action}, "secondary") })` },
    { title: "Visual cards", components: ["VisualCardBlock", "VisualCardItem"], code: `root = Card([VisualCardBlock([VisualCardItem(BoldText("text", "Across the Golden Gate", "A new perspective on the bay"), "bridge", "${bridge}", Tag("Outdoors", null, "sm", "neutral"), "Golden Gate Bridge"), VisualCardItem(BoldText("text", "An island story", "Alcatraz, San Francisco"), "island", "${island}", Tag("History", null, "sm", "neutral"), "Alcatraz Island")], "grid", true, ${action})])` },
  ] },
  { id: "forms", label: "Forms", description: "Real inputs, validation, selections, and local preview submissions.", examples: [
    { title: "Inputs & dates", components: ["Form", "FormControl", "Label", "Input", "TextArea", "Select", "SelectItem", "DatePicker"], code: `root = Card([form])
form = Form("gallery-details", Buttons([Button("Submit preview", ${action}, "primary")]), [name, email, pace, date, note])
name = FormControl("Name", Input("name", "Your name", "text", { required: true, minLength: 2 }))
email = FormControl("Email", Input("email", "you@example.com", "email", { required: true, email: true }))
pace = FormControl("Preferred pace", Select("pace", [SelectItem("relaxed", "Relaxed"), SelectItem("balanced", "Balanced"), SelectItem("active", "Active")], "Choose a pace"))
date = FormControl("Travel date", DatePicker("date", "single"))
note = FormControl("Anything else?", TextArea("note", "A place you would love to visit…", 3), "Optional")` },
    { title: "Selections & sliders", components: ["Chips", "ChipItem", "OptionCards", "OptionCard", "CheckBoxGroup", "CheckBoxItem", "RadioGroup", "RadioItem", "Slider"], code: `root = Card([form])
form = Form("gallery-preferences", Buttons([Button("Apply preview preferences", ${action}, "primary")]), [interests, style, access, gettingAround, distance])
interests = FormControl("Your interests", Chips("interests", "multiple", [ChipItem("art", "Art"), ChipItem("food", "Food"), ChipItem("nature", "Nature"), ChipItem("history", "History")]))
style = FormControl("Make it your day", OptionCards("style", "single", [OptionCard("slow", "Take it slow", "A little more time at every stop", Icon("coffee", "food")), OptionCard("explore", "Keep exploring", "More places, more possibilities", Icon("compass", "travel"))]))
access = FormControl("Helpful details", CheckBoxGroup("access", [CheckBoxItem("Step-free access", "Prefer accessible paths", "stepfree"), CheckBoxItem("Indoor options", "Have a rainy-day alternative", "indoors")]))
gettingAround = FormControl("Getting around", RadioGroup("transport", [RadioItem("On foot", "Stay close to the neighborhoods", "walk"), RadioItem("Public transit", "Explore a little further", "transit")], "walk"))
distance = FormControl("Walking distance", Slider("distance", "continuous", 1, 15, 1, [6], "Kilometers"))` },
  ] },
  { id: "layout", label: "Lists & layout", description: "Progressive disclosure and structured answers that stay easy to navigate.", examples: [
    { title: "Tabs & accordion", components: ["Tabs", "TabItem", "Accordion", "AccordionItem"], code: `root = Card([Tabs([TabItem("overview", "Overview", [TextContent("A thoughtfully paced day with time for the things you enjoy."), Callout("neutral", "Your day, your pace", "Change the plan as you go.")]), TabItem("details", "Details", [TextContent("Start in the morning, explore one neighborhood, and leave the afternoon open.")])]), Accordion([AccordionItem("weather", "What if it rains?", [TextContent("Choose an indoor stop and keep a flexible plan for the afternoon.")]), AccordionItem("change", "Can I change my plan?", [TextContent("Yes. Edit a stop, switch a preference, or ask for another idea.")])])` },
    { title: "Lists, steps & follow-ups", components: ["ListBlock", "ListItem", "Steps", "StepsItem", "FollowUpBlock", "FollowUpItem", "EntityList"], code: `root = Card([ListBlock([ListItem("Find your starting point", "Pick a neighborhood you want to explore.", null, "Try", ${action}), ListItem("Make room for a detour", "The best discoveries are sometimes unplanned.", null, "Try", ${action})], "number"), Steps([StepsItem("Choose a direction", "Start with a question or an idea."), StepsItem("Explore the answer", "Use the controls to make it your own."), StepsItem("Keep the conversation going", "Ask for a different view whenever you need one.")]), EntityList([{ left: "Morning", right: "Neighborhood walk" }, { left: "Afternoon", right: "Waterfront" }], "default"), FollowUpBlock([FollowUpItem("Make this a shorter day"), FollowUpItem("Add a museum stop")])])` },
    { title: "Sections & carousel", components: ["SectionBlock", "SectionItem", "Carousel"], code: `root = Card([SectionBlock([SectionItem("first", "Before you go", [TextContent("Check opening times and bring a comfortable pair of shoes.")]), SectionItem("second", "Along the way", [TextContent("Leave time between stops to follow your curiosity.")])], true), Carousel([[InlineHeader("A morning outside", "Fresh air and a new view"), TextContent("A short walk is a good place to start.")], [InlineHeader("An afternoon indoors", "A different kind of discovery"), TextContent("Find a gallery, museum, or neighborhood bookshop.")]])])` },
  ] },
  { id: "charts", label: "Charts", description: "Illustrative data, consistent axes, and useful detail on hover.", examples: [
    { title: "Bar, line & area", components: ["BarChart", "LineChart", "AreaChart", "Series"], code: `root = Card([Tabs([TabItem("bar", "Bars", [BarChart(labels, [first, second], "grouped", "Month", "Visits (k)", 280)]), TabItem("line", "Lines", [LineChart(labels, [first, second], "natural", "Month", "Visits (k)", 280)]), TabItem("area", "Area", [AreaChart(labels, [first, second], "natural", "Month", "Visits (k)", 280)])])])
labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
first = Series("This year", [18, 24, 21, 34, 42, 48])
second = Series("Last year", [12, 18, 19, 25, 31, 35])` },
    { title: "Part of a whole", components: ["PieChart", "RadialChart", "SingleStackedBarChart", "Slice"], code: `root = Card([Tabs([TabItem("donut", "Donut", [PieChart(labels, values, "donut")]), TabItem("pie", "Pie", [PieChart(labels, values, "pie")]), TabItem("radial", "Radial", [RadialChart(labels, values)]), TabItem("stack", "Stacked", [SingleStackedBarChart(labels, values)])])])
labels = ["Walking", "Transit", "Cycling"]
values = [52, 31, 17]
legacySlice = Slice("Walking", 52)` },
    { title: "Comparison & relationships", components: ["HorizontalBarChart", "RadarChart", "ScatterChart", "ScatterSeries", "Point"], code: `root = Card([Tabs([TabItem("horizontal", "Horizontal", [HorizontalBarChart(["Neighborhood walks", "Museums & galleries", "Food & drink", "Waterfront"], [Series("Saved ideas", [42, 31, 27, 19])], "grouped", "Ideas", "")]), TabItem("radar", "Radar", [RadarChart(["Culture", "Food", "Nature", "History", "Shopping"], [Series("Your interests", [80, 95, 60, 75, 40]), Series("This itinerary", [85, 80, 65, 85, 30])])]), TabItem("scatter", "Scatter", [ScatterChart([ScatterSeries("Stops", [Point(1, 15), Point(2, 30), Point(3, 25), Point(4, 45), Point(5, 60), Point(6, 50)])], "Distance (km)", "Time (min)")])])])` },
  ] },
  { id: "tables", label: "Tables", description: "Readable comparisons and cells you can actually edit.", examples: [
    { title: "Read-only table", components: ["Table", "Col"], code: `root = Card([Table([Col("Stop", ["Golden Gate Bridge", "Alcatraz Island", "Ferry Building"]), Col("Time", ["45–60 min", "3–3.5 hours", "45 min"]), Col("Category", ["Outdoors", "History", "Food & drink"])])])` },
    { title: "Editable table", components: ["EditableTable"], code: `root = Card([EditableTable("gallery-itinerary", [{ type: "text", key: "stop", header: "Stop" }, { type: "number", key: "minutes", header: "Minutes" }, { type: "select", key: "category", header: "Category", options: [{ value: "outdoors", label: "Outdoors" }, { value: "culture", label: "Culture" }, { value: "food", label: "Food" }] }], [{ id: "1", values: ["Neighborhood walk", 45, "outdoors"] }, { id: "2", values: ["Gallery visit", 60, "culture"] }, { id: "3", values: ["Lunch by the bay", 90, "food"] }])])` },
  ] },
  { id: "media", label: "Images", description: "Real Wikimedia photographs in the existing image primitives.", examples: [
    { title: "Image gallery", components: ["ImageGallery"], code: `root = Card([ImageGallery([{ src: "${bridge}", alt: "Golden Gate Bridge from Battery East", details: "Golden Gate Bridge · Wikimedia Commons" }, { src: "${island}", alt: "Alcatraz Island in San Francisco Bay", details: "Alcatraz Island · Wikimedia Commons" }])])` },
    { title: "Image & image block", components: ["Image", "ImageBlock"], code: `root = Card([Tabs([TabItem("image", "Image", [Image("Golden Gate Bridge", "${bridge}")]), TabItem("block", "Image block", [ImageBlock("${island}", "Alcatraz Island")])])])` },
  ] },
];

const galleryCss = `
.iui-primitives { width: 100%; max-width: 900px; margin: 0 auto; padding: 10px 0 60px; color: var(--iui-ink); }
.iui-primitives-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.iui-primitives-heading h2 { font-size: 28px; line-height: 1.25; font-weight: 500; letter-spacing: -.7px; }
.iui-primitives-heading p { color: var(--iui-muted); font-size: 14px; line-height: 1.6; margin-top: 8px; }
.iui-primitives-count { color: var(--iui-muted); white-space: nowrap; font-size: 12px; padding: 6px 10px; border: 1px solid var(--iui-border); border-radius: 999px; }
.iui-primitives-nav { display: flex; gap: 6px; overflow-x: auto; padding: 24px 0 18px; margin-bottom: 20px; border-bottom: 1px solid var(--iui-border); }
.iui-primitives-nav button { white-space: nowrap; padding: 8px 14px; border-radius: 999px; font-size: 13px; color: var(--iui-muted); }
.iui-primitives-nav button:hover { background: var(--iui-surface); color: var(--iui-ink); }
.iui-primitives-nav button[aria-selected=true] { background: var(--iui-ink); color: var(--iui-canvas); }
.iui-primitives-description { font-size: 14px; color: var(--iui-muted); line-height: 1.6; margin-bottom: 30px; }
.iui-primitive-example { margin-bottom: 32px; }
.iui-primitive-example > header { display: flex; align-items: baseline; justify-content: space-between; gap: 15px; margin-bottom: 12px; }
.iui-primitive-example > header h2 { font-size: 15px; font-weight: 500; }
.iui-primitive-example > header span { color: var(--iui-muted); font-size: 11px; text-align: right; max-width: 60%; }
.iui-primitive-preview { border: 1px solid var(--iui-border); border-radius: 18px; padding: 24px; min-width: 0; background: var(--iui-canvas); }
.iui-primitive-preview > .openui-card { gap: 20px !important; }
.iui-primitive-preview .openui-card { min-width: 0; }
.iui-primitives-notice { position: sticky; bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 13px 18px; border: 1px solid var(--iui-border); border-radius: 14px; background: var(--iui-ink); color: var(--iui-canvas); box-shadow: var(--iui-shadow); font-size: 13px; z-index: 5; }
.iui-primitives-notice button { flex: 0 0 auto; font-size: 20px; line-height: 1; }
.iui-primitives .openui-switch-group { margin-top: 14px; }
@media(max-width: 640px) { .iui-primitives { padding: 10px 0 45px; } .iui-primitives-heading { display: block; } .iui-primitives-count { display: inline-flex; margin-top: 14px; } .iui-primitive-preview { padding: 16px; } .iui-primitive-example > header { display: block; } .iui-primitive-example > header span { display: block; text-align: left; max-width: 100%; margin-top: 5px; line-height: 1.6; } }
`;

export function PrimitivesGallery() {
  const [active, setActive] = useState("essentials");
  const [notice, setNotice] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(false);
  const family = primitiveFamilies.find((item) => item.id === active)!;
  const handleAction = useCallback((event: ActionEvent) => {
    setNotice(`${event.humanFriendlyMessage || "Action received"} — completed in this local preview.`);
  }, []);

  return <ThemeProvider cssSelector=":root" lightTheme={{ defaultChartPalette: ["#0285ff", "#00a67d", "#8b5cf6", "#f4a340", "#e46d91", "#4b9ca6"] }}>
    <section className="iui-primitives" aria-label="Component library">
      <style>{galleryCss}</style>
      <div className="iui-primitives-heading"><div><h2>84 familiar building blocks</h2><p>Everyday building blocks, with the same familiar design language.</p></div><span className="iui-primitives-count">{primitiveCount} existing components</span></div>
      <div className="iui-primitives-nav" role="tablist" aria-label="Component families">{primitiveFamilies.map((item) => <button id={`primitive-tab-${item.id}`} key={item.id} type="button" role="tab" aria-selected={active === item.id} aria-controls="primitive-panel" tabIndex={active === item.id ? 0 : -1} onClick={() => { setActive(item.id); setNotice(""); }} onKeyDown={(event) => {
        const index = primitiveFamilies.findIndex((f) => f.id === active);
        const next = event.key === "ArrowRight" ? (index + 1) % primitiveFamilies.length : event.key === "ArrowLeft" ? (index + primitiveFamilies.length - 1) % primitiveFamilies.length : event.key === "Home" ? 0 : event.key === "End" ? primitiveFamilies.length - 1 : -1;
        if (next >= 0) { event.preventDefault(); setActive(primitiveFamilies[next].id); setNotice(""); document.getElementById(`primitive-tab-${primitiveFamilies[next].id}`)?.focus(); }
      }}>{item.label}</button>)}</div>
      <div id="primitive-panel" role="tabpanel" aria-labelledby={`primitive-tab-${active}`} key={active}>
        <p className="iui-primitives-description">{family.description}</p>
        {family.examples.map((example) => <section className="iui-primitive-example" key={example.title}><header><h2>{example.title}</h2><span>{example.components.join(" · ")}</span></header><div className="iui-primitive-preview"><Renderer response={example.code} library={openuiChatLibrary} isStreaming={false} onAction={handleAction} /></div></section>)}
        {active === "forms" && <section className="iui-primitive-example"><header><h2>Switches & labels</h2><span>SwitchGroup · SwitchItem · Label</span></header><div className="iui-primitive-preview"><Label>Preferences</Label><SwitchGroup><SwitchItem label="Trip reminders" description="A little help staying on track" checked={notifications} onChange={setNotifications} /><SwitchItem label="New ideas" description="Suggestions for places to explore" checked={reminders} onChange={setReminders} /></SwitchGroup></div></section>}
      </div>
      {notice && <div className="iui-primitives-notice" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss preview confirmation" onClick={() => setNotice("")}>×</button></div>}
    </section>
  </ThemeProvider>;
}
