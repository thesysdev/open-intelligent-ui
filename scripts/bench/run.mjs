// Runs the Intelligent UI prompts (16 example prompts and 8 dashboard prompts)
// against a model on any OpenAI-compatible endpoint, saves each answer, checks
// it with the OpenUI Lang 1.0 parser, flags @names the library does not have,
// and screenshots each answer in light and dark through the app's /preview page.
//
//   npm run bench -- --model <id> --base-url https://openrouter.ai/api/v1 --key-env OPENROUTER_API_KEY
//   npm run bench -- --fake          # the hand-written gallery programs stand in for the model
//   npm run bench -- --answers dir   # re-check and re-shoot saved answers (dir/<id>.oui)
//
// The key is read from the named environment variable at run time and is never
// written anywhere. Screenshots need the app running (npm run dev) at --app.
//
// Options: --only id,id  --kind tool|dashboard  --out dir  --app url  --widths 390,1280
//          --no-shots  --concurrency n  --temperature t  --max-tokens n
import { createParser, ACTION_STEPS } from "@openuidev/lang-core";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { values: opt } = parseArgs({
  options: {
    model: { type: "string" },
    "base-url": { type: "string", default: process.env.BENCH_BASE_URL },
    "key-env": { type: "string", default: "BENCH_API_KEY" },
    fake: { type: "boolean", default: false },
    answers: { type: "string" },
    only: { type: "string" },
    kind: { type: "string" },
    out: { type: "string" },
    app: { type: "string", default: "http://localhost:3000" },
    widths: { type: "string", default: "390,1280" },
    "no-shots": { type: "boolean", default: false },
    concurrency: { type: "string", default: "4" },
    temperature: { type: "string" },
    "max-tokens": { type: "string", default: "16000" },
  },
});

const offline = opt.fake || !!opt.answers;
if (!offline && (!opt.model || !opt["base-url"])) {
  console.error("Pass --model and --base-url (or BENCH_BASE_URL), or --fake or --answers for a run without a model.");
  process.exit(1);
}
const apiKey = offline ? null : process.env[opt["key-env"]];
if (!offline && !apiKey) {
  console.error(`Set ${opt["key-env"]} to the API key (or pick another variable with --key-env).`);
  process.exit(1);
}

const label = opt.fake ? "fake" : opt.answers ? "recheck" : opt.model.replace(/[^\w.-]+/g, "_");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const out = path.resolve(opt.out ?? path.join(root, "bench-out", `${label}-${stamp}`));
mkdirSync(path.join(out, "answers"), { recursive: true });

// Prompts, system prompts and the library
let prompts = JSON.parse(readFileSync(path.join(root, "scripts/bench/prompts.json"), "utf8"));
if (opt.only) prompts = prompts.filter((p) => opt.only.split(",").includes(p.id));
if (opt.kind) prompts = prompts.filter((p) => p.kind === opt.kind);
const system = {
  tool: readFileSync(path.join(root, "src/generated/system-prompt.txt"), "utf8"),
  dashboard: readFileSync(path.join(root, "src/generated/dashboard-system-prompt.txt"), "utf8"),
};
const spec = JSON.parse(readFileSync(path.join(root, "src/generated/spec.json"), "utf8"));
const parser = createParser(spec.schema, spec.root);
const libraryFunctions = new Set(Object.keys(spec.functions ?? {}));
const declared = new Set([...Object.keys(ACTION_STEPS), "Action", ...libraryFunctions, ...Object.keys(spec.actions ?? {})]);
// lang-core 1.0 does not export its built-in list, so ask the parser whether it knows a name
const probed = new Map();
const known = {
  has(name) {
    if (declared.has(name)) return true;
    if (!probed.has(name)) {
      const r = parser.parse(`x = @${name}()\nroot = ${spec.root}([x])`);
      probed.set(name, !r.meta.errors.some((e) => e.code === "unknown-function"));
    }
    return probed.get(name);
  },
};

// Answers
/** The program in a reply: the first fenced block if there is one, else the whole text. */
function extractProgram(text) {
  const fence = /```[\w-]*\n([\s\S]*?)```/.exec(text);
  return (fence ? fence[1] : text).trim();
}

async function ask(prompt) {
  const body = {
    model: opt.model,
    messages: [
      { role: "system", content: system[prompt.kind] },
      { role: "user", content: prompt.prompt },
    ],
    max_tokens: Number(opt["max-tokens"]),
    ...(opt.temperature ? { temperature: Number(opt.temperature) } : {}),
  };
  const started = Date.now();
  const res = await fetch(`${opt["base-url"].replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return { text: json.choices?.[0]?.message?.content ?? "", usage: json.usage ?? null, ms: Date.now() - started, raw: json };
}

async function savedAnswers() {
  if (opt.answers) {
    const dir = path.resolve(opt.answers);
    const files = readdirSync(dir).filter((f) => f.endsWith(".oui"));
    return new Map(files.map((f) => [f.replace(/\.oui$/, ""), readFileSync(path.join(dir, f), "utf8")]));
  }
  // Node strips the types from the .ts module; it has no runtime imports
  const mod = await import(pathToFileURL(path.join(root, "src/app/gallery/tool-programs.ts")).href);
  return new Map(mod.toolPrograms.map((p) => [p.example, p.code]));
}

async function pool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
}

// Checks
/** @names outside string literals; any the library and built-ins do not have are flagged. */
function callNames(program) {
  const code = program.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  return [...code.matchAll(/@([A-Za-z_]\w*)/g)].map((m) => m[1]);
}

function check(program) {
  const result = parser.parse(program);
  const names = callNames(program);
  const errors = result.meta.errors.map((e) => `${e.code}: ${e.message}`);
  return {
    parsed: !!result.root,
    errors,
    unresolved: result.meta.unresolved,
    orphaned: result.meta.orphaned,
    statements: result.meta.statementCount,
    unknownNames: [...new Set(names.filter((n) => !known.has(n)))],
    unknownComponents: [...new Set(result.meta.errors.filter((e) => e.code === "unknown-component").map((e) => e.component))],
    functionsUsed: [...new Set(names.filter((n) => libraryFunctions.has(n)))].sort(),
    stateVariables: Object.keys(result.stateDeclarations).length,
    setSteps: names.filter((n) => n === "Set" || n === "Reset").length,
    toAssistant: names.filter((n) => n === "ToAssistant").length,
    queries: result.queryStatements.length,
  };
}

// Run
const fakes = offline ? await savedAnswers() : null;
console.log(`${prompts.length} prompts → ${out}`);
const entries = await pool(prompts, offline ? prompts.length : Number(opt.concurrency), async (prompt) => {
  const entry = { id: prompt.id, kind: prompt.kind, prompt: prompt.prompt };
  try {
    if (fakes) {
      if (!fakes.has(prompt.id)) return { ...entry, skipped: opt.fake ? "no hand-written program" : "no saved answer" };
      entry.text = fakes.get(prompt.id);
    } else {
      const reply = await ask(prompt);
      Object.assign(entry, { text: reply.text, usage: reply.usage, ms: reply.ms });
      writeFileSync(path.join(out, "answers", `${prompt.id}.json`), JSON.stringify(reply.raw, null, 2));
      if (typeof reply.text !== "string" || !reply.text.trim()) {
        throw new Error("The model response must contain non-empty text in choices[0].message.content.");
      }
    }
    entry.program = extractProgram(entry.text);
    writeFileSync(path.join(out, "answers", `${prompt.id}.oui`), entry.program);
    entry.check = check(entry.program);
    const c = entry.check;
    console.log(`${prompt.id}: ${c.errors.length} errors, unknown [${c.unknownNames.join(", ")}], ${c.functionsUsed.length} functions, ${c.stateVariables} $vars`);
  } catch (err) {
    entry.error = err instanceof Error ? err.message : String(err);
    console.log(`${prompt.id}: ${entry.error}`);
  }
  delete entry.text;
  return entry;
});

// Screenshots
if (!opt["no-shots"]) {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? "playwright-core");
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const widths = opt.widths.split(",").map(Number);
  mkdirSync(path.join(out, "shots"), { recursive: true });
  for (const entry of entries.filter((e) => e.program)) {
    entry.shots = [];
    entry.render = {};
    for (const theme of ["light", "dark"]) {
      for (const width of widths) {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 2 });
        const console_ = [];
        page.on("console", (m) => m.type() === "error" && console_.push(m.text().slice(0, 300)));
        page.on("pageerror", (e) => console_.push(`pageerror: ${e.message}`));
        await page.addInitScript((program) => {
          globalThis[Symbol.for("openui.devtools.autoMount")] = true;
          window.__OPENUI_PROGRAM__ = program;
        }, entry.program);
        await page.goto(`${opt.app}/preview?theme=${theme}`, { waitUntil: "networkidle", timeout: 120000 });
        // Query data, image searches and map tiles settle after load
        await page.waitForTimeout(2500);
        const file = `shots/${entry.id}-${theme}-${width}.png`;
        await page.locator(".preview-root").screenshot({ path: path.join(out, file) });
        entry.shots.push(file);
        entry.render[`${theme}-${width}`] = {
          errors: await page.evaluate(() => window.__OPENUI_ERRORS__ ?? []),
          console: console_,
          overflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
        };
        await page.close();
      }
    }
    console.log(`${entry.id}: ${entry.shots.length} screenshots`);
  }
  await browser.close();
}

// Report
const done = entries.filter((e) => e.check);
const summary = {
  model: opt.fake ? "fake (hand-written gallery programs)" : opt.answers ? `saved answers in ${opt.answers}` : opt.model,
  baseUrl: offline ? null : opt["base-url"],
  date: new Date().toISOString(),
  prompts: entries.length,
  answered: done.length,
  skipped: entries.filter((e) => e.skipped).length,
  failed: entries.filter((e) => e.error).length,
  parseClean: done.filter((e) => !e.check.errors.length && !e.check.unresolved.length).length,
  withUnknownNames: done.filter((e) => e.check.unknownNames.length).length,
  interactive: done.filter((e) => e.check.stateVariables > 0 || e.check.queries > 0).length,
  usingToAssistant: done.filter((e) => e.check.toAssistant > 0).length,
  renderErrors: done.filter((e) => Object.values(e.render ?? {}).some((r) => r.errors.length || r.console.length)).length,
};
writeFileSync(path.join(out, "report.json"), JSON.stringify({ summary, entries }, null, 2));

const cell = (v) => String(v).replaceAll("|", "\\|");
const md = [
  `# Bench: ${summary.model}`,
  "",
  `${summary.date}. ${summary.answered} answered, ${summary.skipped} skipped, ${summary.failed} failed. Parse-clean ${summary.parseClean}/${summary.answered}; unknown @names in ${summary.withUnknownNames}; interactive ($state or Query) ${summary.interactive}; @ToAssistant in ${summary.usingToAssistant}; render errors in ${summary.renderErrors}.`,
  "",
  "| id | kind | parse errors | unknown @names | $vars | @Set/@Reset | @ToAssistant | functions used | render errors | light | dark |",
  "|---|---|---|---|---|---|---|---|---|---|---|",
  ...entries.map((e) => {
    if (!e.check) return `| ${e.id} | ${e.kind} | ${cell(e.skipped ?? e.error)} | | | | | | | | |`;
    const c = e.check;
    const renderErrors = Object.values(e.render ?? {}).reduce((n, r) => n + r.errors.length + r.console.length, 0);
    const shot = (theme) => (e.shots ?? []).filter((s) => s.includes(`-${theme}-`)).map((s) => `[${s.split("-").pop().replace(".png", "")}](${s})`).join(" ");
    return `| ${e.id} | ${e.kind} | ${c.errors.length + c.unresolved.length} | ${cell(c.unknownNames.join(", "))} | ${c.stateVariables} | ${c.setSteps} | ${c.toAssistant} | ${cell(c.functionsUsed.join(", "))} | ${renderErrors} | ${shot("light")} | ${shot("dark")} |`;
  }),
  "",
];
writeFileSync(path.join(out, "report.md"), md.join("\n"));
console.log(JSON.stringify(summary, null, 2));
console.log(`Report: ${path.join(out, "report.md")}`);
