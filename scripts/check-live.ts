import { writeFile } from "node:fs/promises";
import { createParser } from "@openuidev/lang-core";
import { library } from "../src/lib/library";
async function main() {
const prompt = process.argv[2] || "I'm in Paris for an afternoon. Plan a sightseeing route with four stops.";
const url = process.argv[3] || "http://127.0.0.1:3002/api/chat";
const started = performance.now();
const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }) });
if (!response.ok || !response.body) throw new Error(`Chat failed: ${response.status}`);
let source = "", pending = "", firstChunk: number | undefined;
const reader = response.body.getReader();
for (;;) {
  const {done, value} = await reader.read();
  if (done) break;
  firstChunk ??= performance.now() - started;
  pending += new TextDecoder().decode(value);
  const lines = pending.split("\n"); pending = lines.pop() || "";
  for (const line of lines) if (line.trim()) source += JSON.parse(line).choices?.[0]?.delta?.content || "";
}
if (pending.trim()) source += JSON.parse(pending).choices?.[0]?.delta?.content || "";
const result = createParser(library.toJSONSchema()).parse(source);
console.log(JSON.stringify({ prompt, durationMs: Math.round(performance.now() - started), firstChunkMs: Math.round(firstChunk || 0), meta: result.meta, characters: source.length }, null, 2));
if (process.env.LIVE_OUTPUT) await writeFile(process.env.LIVE_OUTPUT, source);
if (!result.root || result.meta.errors.length || result.meta.incomplete) process.exitCode = 1;

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
