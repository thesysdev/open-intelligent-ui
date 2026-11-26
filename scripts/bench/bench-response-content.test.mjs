import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./run.mjs", import.meta.url));
function run(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--no-warnings", script, ...args], {
      env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
function temporary(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "iui-bench-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

import { createServer } from "node:http";
test("invalid successful completions are failures and retain raw responses", async (t) => {
  let payload;
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const dir = temporary(t);
  const cases = [{}, { choices: [] }, ...[null, "", "   ", [{ type: "text", text: "hello" }]].map((content) => ({ choices: [{ message: { content } }] }))];
  for (const [index, value] of cases.entries()) {
    payload = value;
    const out = path.join(dir, String(index));
    await run(["--model", "local-test", "--base-url", `http://127.0.0.1:${server.address().port}`,
      "--only", "bicycle", "--no-shots", "--out", out], { BENCH_API_KEY: "test-only" });
    const { summary, entries } = JSON.parse(readFileSync(path.join(out, "report.json")));
    assert.equal(summary.failed, 1, JSON.stringify(value));
    assert.equal(summary.answered, 0);
    assert.match(entries[0].error, /non-empty text/);
    assert.deepEqual(JSON.parse(readFileSync(path.join(out, "answers/bicycle.json"))), value);
    assert.equal(existsSync(path.join(out, "answers/bicycle.oui")), false);
  }
  payload = { choices: [{ message: { content: 'root = Col([Text("Hello")])' } }] };
  const out = path.join(dir, "valid");
  const result = await run(["--model", "local-test", "--base-url", `http://127.0.0.1:${server.address().port}`,
    "--only", "bicycle", "--no-shots", "--out", out], { BENCH_API_KEY: "test-only" });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(readFileSync(path.join(out, "report.json"))).summary.parseClean, 1);
});
