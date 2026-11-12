// The lesson data for /learn. Each lesson is a title plus an ordered list of
// blocks: prose (markdown), lang (editable, live-rendered OpenUI Lang) and
// code (read-only TypeScript). Prose and titles are bilingual (en/zh); code is
// never translated. Every `lang` block is validated by the parser test.

export type Locale = "en" | "zh";
export type Localized = { en: string; zh: string };

const L = (en: string, zh: string): Localized => ({ en, zh });

export type LessonBlock =
  | { kind: "prose"; text: Localized }
  | { kind: "lang"; title?: Localized; code: string }
  | { kind: "code"; title?: Localized; code: string };

export type Lesson = {
  id: string;
  part: number;
  title: Localized;
  blocks: LessonBlock[];
};

export const lessons: Lesson[] = [
  {
    id: "what-is-openui",
    part: 0,
    title: L("What is OpenUI", "什么是 OpenUI"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "OpenUI turns a model's answer into a **working page**, not a wall of text. The model writes a tiny language called **OpenUI Lang** — a tree of components — and the app renders it with the same component library your React app already ships.\n\nYou will learn, in order: the Lang itself, how to author the four kinds of thing the model can use (components, functions, actions, tools), how to teach the model to use them well, how to generate and wire the runtime, and the contract you must keep stable.\n\nEdit the snippet on the left and watch it re-render on the right.",
          "OpenUI 把模型的回答变成一个**可交互的页面**,而不是一坨文字。模型写一种叫 **OpenUI Lang** 的小语言——一棵组件树——然后 App 用你 React 应用里已有的那套组件库来渲染它。\n\n你会按顺序学到:Lang 本身、如何编写模型能用的四种东西(组件、函数、动作、工具)、如何教模型用好它们、如何生成并接入运行时,以及必须保持稳定的契约。\n\n编辑左侧的代码片段,看右侧实时重新渲染。",
        ),
      },
      {
        kind: "lang",
        title: L("Your first page", "你的第一个页面"),
        code: `root = Col([Title("Hello, OpenUI", "xl"), Text("This page is written as OpenUI Lang. Change the title and watch it update.", "md", "muted"), Row([Badge("no HTML"), Badge("no CSS"), Badge("just a tree", "success")], 1, null, null, true)])`,
      },
    ],
  },

  {
    id: "lang-composition",
    part: 1,
    title: L("Composition", "组合"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "Everything is one expression assigned to a name. The page starts at `root`, and each statement builds a part from the ones before it. Components nest like HTML: a `Col` holds a `Title` and a `Grid`, and a `Grid` holds `Card`s.\n\nStatements run top to bottom, so a name must be defined before you use it. This is the whole structure model — you will read, edit and debug the same language.",
          "所有东西都是一个赋给某个名字的表达式。页面从 `root` 开始,每条语句用前面定义的部分来构建。组件像 HTML 一样嵌套:`Col` 装一个 `Title` 和一个 `Grid`,`Grid` 装 `Card`。\n\n语句从上到下执行,所以名字要先定义再使用。这就是整个结构模型——你读、改、调试的都是同一种语言。",
        ),
      },
      {
        kind: "lang",
        title: L("A composed page", "一个组合出来的页面"),
        code: `root = Col([head, Grid([a, b], 2, 220, 3)])
head = Col([Title("Two beaches", "xl"), Text("A pair of trips, side by side.", "md", "muted")], 1)
a = Card([Title("Algarve", "md"), Text("Golden cliffs and quiet coves.", "sm"), Badge("Sunny", "success")])
b = Card([Title("Costa Verde", "md"), Text("Pine forests and surf.", "sm"), Badge("Lush", "info")])`,
      },
    ],
  },

  {
    id: "lang-state",
    part: 1,
    title: L("State", "状态"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "State lives in `$variables`. An input's first argument is a `$variable`, and anything that reads it updates as the user changes it. Buttons and `Pressable` change state with `@Set`. The page recomputes on its own — no second model call.\n\nTry the stepper: the count is `$guests`, and the `Text` below just reads it and does the math.",
          "状态存在 `$variables` 里。输入控件的第一个参数就是一个 `$variable`,任何读它的地方都会随着用户操作而更新。按钮和 `Pressable` 用 `@Set` 改状态。页面自己重新计算——不需要第二次调用模型。\n\n试试这个步进器:计数是 `$guests`,下面的 `Text` 直接读它并做计算。",
        ),
      },
      {
        kind: "lang",
        title: L("A stepper", "一个步进器"),
        code: `root = Col([Title("Guests", "lg"), stepper, Text("Plates needed: " + $guests * 2, "md")], 2)
$guests = 4
stepper = Row([IconButton("minus", @Set($guests, @Clamp($guests - 1, 1, 12)), "Fewer"), Text($guests + "", "lg", null, "semibold"), IconButton("plus", @Set($guests, @Clamp($guests + 1, 1, 12)), "More")], 3)`,
      },
    ],
  },

  {
    id: "lang-compute",
    part: 1,
    title: L("Compute", "计算"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "`@functions` compute everything shown from your state and data. `@Each` maps a list into rows; `@Sum`, `@Count` and `@Top` aggregate. The model never hardcodes a number it can derive — the page stays correct as the data changes.\n\nBelow, the total and the list both come from `items`.",
          "`@functions` 从你的状态和数据里算出页面上显示的一切。`@Each` 把列表映射成行;`@Sum`、`@Count`、`@Top` 做聚合。模型绝不硬编码一个它能推导出来的数字——数据变了页面依然正确。\n\n下面,总数和列表都来自 `items`。",
        ),
      },
      {
        kind: "lang",
        title: L("Derived rows", "推导出来的行"),
        code: `root = Col([Title("Shopping", "lg"), Grid(@Each(items, "i", Card([Text(i.name, "sm", null, "semibold"), Caption(@Format(i.price, "currency"))])), 2, 200, 2), Card([Row([Caption("Total"), Spacer(), Text(@Format(@Sum(items.price), "currency"), "md", null, "semibold")], 2)], "soft")], 3)
items = [{name: "Milk", price: 1.2}, {name: "Eggs", price: 3.4}, {name: "Bread", price: 2.1}, {name: "Coffee", price: 9.5}]`,
      },
    ],
  },

  {
    id: "lang-actions",
    part: 1,
    title: L("Actions", "动作"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "Actions are what the page does when the user taps. `@Set` changes a `$variable`; `@ToAssistant` sends a short first-person message back to the chat; `@CopyToClipboard` and `@OpenUrl` reach the app. A `Button` or `Pressable` runs them.\n\nThe form below hands its choice to the assistant. In the chat this sends a message; in this playground it is a no-op.",
          "动作是页面在用户点击时做的事。`@Set` 改一个 `$variable`;`@ToAssistant` 把一句第一人称的短消息发回聊天;`@CopyToClipboard` 和 `@OpenUrl` 交给 App 处理。按钮或 `Pressable` 触发它们。\n\n下面的表单把选择交给助手。在聊天里这会发一条消息;在这个 playground 里它是空操作。",
        ),
      },
      {
        kind: "lang",
        title: L("Hand off to the assistant", "交给助手"),
        code: `root = Col([Title("Say hi", "lg"), Text("Choose a vibe, then hand it to the assistant.", "md", "muted"), Form([RadioGroup($pace, ["Relaxed", "Packed"], "Pace", "pills"), Button("Plan my trip", @ToAssistant("Plan a " + $pace + " trip"))])], 3)
$pace = "Relaxed"`,
      },
    ],
  },

  {
    id: "lang-working-tool",
    part: 1,
    title: L("A working tool", "一个能用的工具"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "Put it together: state in `$variables`, everything shown computed with `@functions`, and inputs that change the state with `@Set`. The page works entirely on its own — no message sent back for a result.\n\nThis is the bar every good answer meets: **a working tool, not a form letter**.",
          "把它们组合起来:状态放在 `$variables` 里,显示的一切都用 `@functions` 计算,输入控件用 `@Set` 改状态。页面完全靠自己工作——不用把结果发回给模型。\n\n这是每个好回答都应该达到的标准:**一个能用的工具,而不是一封套话回信**。",
        ),
      },
      {
        kind: "lang",
        title: L("Split the bill", "AA 分账"),
        code: `root = Col([Title("Split the bill", "xl"), Text("Move the slider, step the people; each share recomputes.", "md", "muted"), Row([Caption("Bill"), Spacer(), Text(@Format($bill, "currency"), "md", null, "semibold")], 2), Slider($bill, 10, 200), Row([Caption("People"), Spacer(), stepper], 2), Card([Row([Caption("Each pays"), Spacer(), Title(@Format($bill * 1.2 / $people, "currency"), "xl")], 2)], "soft")], 3)
$bill = 60
$people = 2
stepper = Row([IconButton("minus", @Set($people, @Clamp($people - 1, 1, 12)), "Fewer"), Text($people + "", "md", null, "semibold"), IconButton("plus", @Set($people, @Clamp($people + 1, 1, 12)), "More")], 3)`,
      },
    ],
  },

  {
    id: "author-component",
    part: 2,
    title: L("defineComponent", "defineComponent"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "A component is four things: a `name` the model writes, a zod `props` schema (the arguments), a `description` (prose that teaches the model when and how to use it), and a `component` (your React). The model never sees your React — it sees the name, the schema and the description.\n\nThe description is the real documentation. This is the running example's `KpiCard`, which you saw in the metrics grid.",
          "一个组件有四样东西:模型会写的 `name`、一个 zod `props` schema(参数)、一个 `description`(教模型何时以及如何用它的散文),还有一个 `component`(你的 React)。模型永远看不到你的 React——它看到的是名字、schema 和描述。\n\n这个 `description` 才是真正的文档。下面是贯穿示例里的 `KpiCard`,你在指标网格里见过它。",
        ),
      },
      {
        kind: "code",
        title: L("src/lib/learn/components.tsx", "src/lib/learn/components.tsx"),
        code: `export const KpiCard = defineComponent({
  name: "KpiCard",
  props: z.object({
    label: z.string(),
    value: z.number(),
    format: z.enum(["number", "currency", "percent"]).optional(),
    delta: z.number().optional(),
    currency: z.string().optional(),
  }),
  description:
    "A metric tile: a caption label, a large value, and an optional delta showing the change (green when up, red when down). format is number, currency or percent; currency is a code like EUR.",
  component: ({ props }) => (
    <div className="lrn-kpi">
      <span className="lrn-kpi-label">{props.label}</span>
      <span className="lrn-kpi-value">{props.value}</span>
    </div>
  ),
});`,
      },
      {
        kind: "lang",
        title: L("What the model writes", "模型写出来的代码"),
        code: `root = Col([Title("This week", "xl"), Grid([KpiCard("Revenue", 428000, "currency", 12000, "USD"), KpiCard("Active users", 18400, "number", 350), KpiCard("Conversion", 3.4, "percent", -0.2), KpiCard("Churn", 2.1, "percent", -0.1)], 2, 200, 3)], 3)`,
      },
    ],
  },

  {
    id: "author-function",
    part: 2,
    title: L("defineFunction", "defineFunction"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "A function is a pure, client-side helper the model calls as `@Name(...)`. It has a `description`, a zod `params` schema, a `returns` schema (so the model knows what comes back), and an `fn` that computes it. Bad arguments, or a throw, evaluate to `null`.\n\nFunctions are how a page does its own math instead of asking the model again.",
          "函数是一个纯的、客户端的助手,模型以 `@Name(...)` 的形式调用。它有一个 `description`、一个 zod `params` schema、一个 `returns` schema(让模型知道会返回什么),以及一个算出结果的 `fn`。坏的参数或抛出异常,结果就是 `null`。\n\n函数让页面自己做数学,而不是再问一次模型。",
        ),
      },
      {
        kind: "code",
        title: L("src/lib/learn/functions.ts", "src/lib/learn/functions.ts"),
        code: `export const Trend = defineFunction({
  name: "Trend",
  description: "The change across a series: the last value minus the first, e.g. @Trend([100, 120, 115]) is 15.",
  params: z.object({ values: z.array(z.number()) }),
  returns: z.number(),
  fn: ({ values }) => {
    if (!Array.isArray(values) || values.length < 2) return 0;
    return values[values.length - 1] - values[0];
  },
});`,
      },
      {
        kind: "lang",
        title: L("What the model writes", "模型写出来的代码"),
        code: `root = Col([Title("Trend", "lg"), Text("Last minus first: " + @Trend([10, 12, 9, 15]), "md"), StatusBadge(@Trend([10, 12, 9, 15]) > 0 ? "Up" : "Down", @Trend([10, 12, 9, 15]) > 0 ? "success" : "danger")], 2)`,
      },
    ],
  },

  {
    id: "author-action",
    part: 2,
    title: L("defineAction", "defineAction"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "An action is a client-side side effect — the clipboard, opening a URL, a follow-up message. Unlike a function it is **two halves**: `defineAction` tells the model the action exists, and a separate handler runs it when it fires (wired through `onAction`).\n\nThe model writes `@CopyToClipboard(...)`; your host receives the event and does the work.",
          "动作是客户端的副作用——剪贴板、打开 URL、一条后续消息。和函数不一样,它是**两半**:`defineAction` 告诉模型这个动作存在,另一个 handler 在它触发时执行(通过 `onAction` 接进来)。\n\n模型写 `@CopyToClipboard(...)`;你的宿主收到事件并做实际工作。",
        ),
      },
      {
        kind: "code",
        title: L("src/lib/actions.ts", "src/lib/actions.ts"),
        code: `export const CopyToClipboard = defineAction({
  name: "CopyToClipboard",
  description: "Copy text to the clipboard.",
  params: z.object({ text: z.string() }),
});

export function runLibraryAction(event: ActionEvent) {
  if (event.type === CopyToClipboard.name) {
    return navigator.clipboard.writeText(event.params.text);
  }
  return null;
}`,
      },
      {
        kind: "lang",
        title: L("What the model writes", "模型写出来的代码"),
        code: `root = Col([Title("Copy it", "lg"), Button("Copy the list", @CopyToClipboard(@Join(["milk", "eggs", "bread"], ", ")), "outline", null, "sm", "copy")], 3)`,
      },
    ],
  },

  {
    id: "author-tool",
    part: 2,
    title: L("ToolSpec", "ToolSpec"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "A tool is server-side data, the opposite of a pure function. The model fetches it with `Query(\"get_metrics\", {...})` and shapes the rows with `@functions`. A tool has a `name`, a `description`, an `inputSchema`, and an `outputSchema` that tells the model what it returns — plus a provider that actually runs it.\n\nThis is how a page reaches your company's backend.",
          "工具是服务端数据,和纯函数正好相反。模型用 `Query(\"get_metrics\", {...})` 取数据,再用 `@functions` 塑形这些行。工具有一个 `name`、一个 `description`、一个 `inputSchema`,还有一个告诉模型它会返回什么的 `outputSchema`——外加一个真正执行它的 provider。\n\n这就是页面访问你们公司后端的方式。",
        ),
      },
      {
        kind: "code",
        title: L("src/lib/learn/tools.ts", "src/lib/learn/tools.ts"),
        code: `export const learnToolSpecs: ToolSpec[] = [{
  name: "get_metrics",
  description: "A company's headline metrics, one row per metric.",
  inputSchema: { type: "object", properties: { days: { type: "number" } } },
  outputSchema: {
    type: "object",
    properties: {
      rows: { type: "array", items: { type: "object",
        properties: { label: { type: "string" }, value: { type: "number" },
          previous: { type: "number" },
          format: { type: "string", enum: ["number", "currency", "percent"] } } } },
    },
  },
}];

export const learnToolProvider = {
  get_metrics: async (args) => ({ rows: metrics(args) }),
};`,
      },
      {
        kind: "lang",
        title: L("What the model writes", "模型写出来的代码"),
        code: `root = Col([Title("Company metrics", "xl"), Text("Fetched with Query, shown as KpiCards.", "md", "muted"), Grid(@Each(rows, "m", KpiCard(m.label, m.value, m.format, m.value - m.previous)), 2, 200, 3)], 3)
rows = Query("get_metrics", {days: 30}, {rows: []})`,
      },
    ],
  },

  {
    id: "model-library",
    part: 3,
    title: L("The library", "组件库"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "`createLibrary` bundles your components, functions and actions into one object the renderer and the prompt both read. `componentGroups` groups components and, crucially, carries `notes` — cross-component rules the model follows (spacing tiers, color names, when to use which).\n\nThe running example extends the base library with its two components and one group.",
          "`createLibrary` 把你的组件、函数和动作打包成一个对象,渲染器和 prompt 都读它。`componentGroups` 给组件分组,更关键的是带 `notes`——模型要遵循的跨组件规则(间距层级、颜色名、什么时候用哪个)。\n\n贯穿示例在基础组件库之上叠加了两个组件和一个分组。",
        ),
      },
      {
        kind: "code",
        title: L("src/lib/learn/library.ts", "src/lib/learn/library.ts"),
        code: `export const learnLibrary = createLibrary({
  root: "Col",
  components: [...baseComponents, KpiCard, StatusBadge],
  functions: [...functions, Trend],
  actions,
  componentGroups: [
    ...baseComponentGroups,
    {
      name: "Metrics",
      components: ["KpiCard", "StatusBadge"],
      notes: [
        "KpiCard shows one metric: a label, a big value and its delta.",
        "StatusBadge is a short pill for a status; tone picks the color.",
      ],
    },
  ],
});`,
      },
    ],
  },

  {
    id: "model-prompt",
    part: 3,
    title: L("Rules and examples", "规则与示例"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "The library tells the model **what** it can use; the prompt options tell it **how**. `additionalRules` are hard constraints (\"answer with a working tool\", \"spacing has three tiers\"), and `examples` are hand-written OpenUI Lang the model imitates. This is where most of the quality comes from.\n\nTry the exercise: change the `description` below and imagine the generated spec entry changing with it — the name, signature and description are exactly what the model sees.",
          "组件库告诉模型**能用**什么;prompt options 告诉它**怎么用**。`additionalRules` 是硬约束(\"用能用的工具来回答\"\"间距分三层\"),`examples` 是模型会模仿的手写 OpenUI Lang。质量主要来自这里。\n\n试试这个练习:改下面的 `description`,想象生成的 spec 条目随之变化——名字、签名和描述正是模型看到的东西。",
        ),
      },
      {
        kind: "code",
        title: L("src/lib/prompt-options.ts (shape)", "src/lib/prompt-options.ts(结构)"),
        code: `export const promptOptions: PromptOptions = {
  bindings: true,
  additionalRules: [
    "Answer with a working tool whenever the request involves numbers, choices, lists or steps.",
    "Spacing is a system with three tiers that always nest: inner, group, section.",
  ],
  examples: [
    "Example 1: a guest stepper ...\n\n" + exampleShoppingList,
  ],
};`,
      },
      {
        kind: "code",
        title: L("The description becomes the spec the model sees", "description 变成模型看到的 spec"),
        code: `{
  "name": "KpiCard",
  "signature": "KpiCard(label: string, value: number, format?: \\"number\\" | \\"currency\\" | \\"percent\\", delta?: number, currency?: string)",
  "description": "A metric tile: a caption label, a large value, and an optional delta..."
}`,
      },
    ],
  },

  {
    id: "wire-generate",
    part: 4,
    title: L("Generate the spec and prompt", "生成 spec 与 prompt"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "The library and prompt options are TypeScript. To hand them to a model you generate two artifacts: a **spec** (names, signatures, descriptions, groups — `--spec`) and a **system prompt** (rules plus examples — with `--prompt-options`).\n\nRegenerate after any change to a name, schema, description, rule or example.",
          "组件库和 prompt options 是 TypeScript。要把它们交给模型,得生成两个产物:一个 **spec**(名字、签名、描述、分组——`--spec`),和一个 **系统 prompt**(规则加示例——带 `--prompt-options`)。\n\n任何名字、schema、描述、规则或示例改过之后,都要重新生成。",
        ),
      },
      {
        kind: "code",
        title: L("package.json", "package.json"),
        code: `"generate": "openui generate src/lib/library.ts --spec --out src/generated/spec.json && openui generate src/lib/learn/library.ts --spec --out src/generated/learn-spec.json",
"prompt": "openui generate src/lib/library.ts --out src/generated/system-prompt.txt --prompt-options promptOptions"`,
      },
      {
        kind: "prose",
        text: L(
          "The spec (`src/generated/*-spec.json`) is sent to the model; the prompt (`*-system-prompt.txt`) is the full system prompt, committed so you can review what changed.",
          "spec(`src/generated/*-spec.json`)发给模型;prompt(`*-system-prompt.txt`)是完整系统 prompt,提交到仓库里方便你审查改了什么。",
        ),
      },
    ],
  },

  {
    id: "wire-runtime",
    part: 4,
    title: L("Wire the runtime", "接入运行时"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "Two ends. The server exposes a route that streams the model's answer; the client renders it. In production the route calls OpenUI Gateway (which validates and corrects the Lang); with `LLM_BASE_URL` it calls any OpenAI-compatible endpoint instead.\n\nOn the client, `fetchLLM` makes the connection and `AgentInterface` (or a bare `Renderer`) draws the page with your library.",
          "两端。服务端暴露一个路由,流式返回模型的回答;客户端渲染它。生产环境里路由调用 OpenUI Gateway(它会校验并纠正 Lang);设置 `LLM_BASE_URL` 则改调任何 OpenAI 兼容端点。\n\n客户端这边,`fetchLLM` 建立连接,`AgentInterface`(或裸的 `Renderer`)用你的组件库把页面画出来。",
        ),
      },
      {
        kind: "code",
        title: L("API route + client wiring", "API 路由 + 客户端接线"),
        code: `// src/app/api/chat/route.ts
import spec from "@/generated/spec.json";
export const POST = createChatHandler(spec, promptOptions);

// client
const llm = fetchLLM({
  url: "/api/chat",
  streamAdapter: openAIResponsesAdapter(),
  messageFormat: openAIConversationMessageFormat,
});
<AgentInterface llm={llm} componentLibrary={library} onAction={runLibraryAction} />`,
      },
    ],
  },

  {
    id: "contract",
    part: 5,
    title: L("The contract", "契约"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "The model's output and your runtime meet at a contract. **You may change how anything looks freely; you may not change the names, argument order, or option values the model writes**, or its output stops matching your components.\n\nKeep these stable, or regenerate the prompt and tell everyone who owns it:",
          "模型的输出和你的运行时在一个契约处相遇。**外观你可以随便改;模型写的名字、参数顺序、可选值你不能动**,否则它的输出就对不上你的组件了。\n\n这些保持稳定,或者重新生成 prompt 并告诉负责它的人:",
        ),
      },
      {
        kind: "code",
        title: L("Do not change without regenerating", "不重新生成就不要改"),
        code: `component and @function names;
the order of their arguments;
option values, e.g. Button's "solid" | "outline" | "soft" | "ghost";
color names: ink, muted, faint, surface, info, success, warning, danger, purple, pink, chart1..chart6.`,
      },
    ],
  },

  {
    id: "verify",
    part: 5,
    title: L("Verify", "验证"),
    blocks: [
      {
        kind: "prose",
        text: L(
          "The generated spec is checked against the library, every gallery program and prompt example is parsed by the 1.0 parser, and the functions are evaluated. A broken snippet fails the build — which is exactly what you want when your component schemas change.",
          "生成的 spec 会和组件库比对,每个 gallery 程序和 prompt 示例都会经过 1.0 parser 解析,函数会被求值。一个坏片段会让构建失败——这恰恰是你改组件 schema 时想要的。",
        ),
      },
      {
        kind: "code",
        title: L("Checks", "检查"),
        code: `npm run generate && npm run prompt   # after changing a schema, function or rule
npm test                               # functions, gallery programs, prompt examples
npm run typecheck
npm run build`,
      },
      {
        kind: "prose",
        text: L(
          "That is the whole loop: author the four primitives, teach the model, generate, wire, and keep the contract stable. You can now plug in your company's components the same way `KpiCard` and `StatusBadge` are plugged in here.",
          "这就是整个循环:编写四种原语、教模型、生成、接线、保持契约稳定。现在你可以像这里的 `KpiCard` 和 `StatusBadge` 一样,接入你们公司的组件了。",
        ),
      },
    ],
  },
];
