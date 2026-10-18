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
test("an unresponsive model is bounded and retains a failure report", { timeout: 10000 }, async (t) => {
  const server = createServer(() => {});
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const out = path.join(temporary(t), "out");
  const result = await run(["--model", "local-test", "--base-url", `http://127.0.0.1:${server.address().port}`,
    "--only", "bicycle", "--no-shots", "--out", out, "--request-timeout-ms", "100"], { BENCH_API_KEY: "test-only" });
  const { summary, entries } = JSON.parse(readFileSync(path.join(out, "report.json")));
  assert.equal(summary.failed, 1);
  assert.equal(summary.answered, 0);
  assert.match(entries[0].error, /timeout|timed out|aborted/i);
});
test("invalid timeouts are rejected before output creation", async (t) => {
  const dir = temporary(t);
  for (const [index, value] of ["0", "-1", "NaN", "Infinity", "1.5", "2147483648", "4294967295", "4294967296", ""].entries()) {
    const out = path.join(dir, String(index));
    const result = await run(["--fake", "--no-shots", "--out", out, "--request-timeout-ms", value]);
    assert.notEqual(result.code, 0, value);
    assert.equal(existsSync(out), false);
  }
});

test("timeout while reading a successful response body stays a failure", { timeout: 10000 }, async (t) => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.flushHeaders();
    response.write('{"choices":[');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const out = path.join(temporary(t), "out");
  await run(["--model", "local-test", "--base-url", `http://127.0.0.1:${server.address().port}`,
    "--only", "bicycle", "--no-shots", "--out", out, "--request-timeout-ms", "100"], { BENCH_API_KEY: "test-only" });
  const { summary, entries } = JSON.parse(readFileSync(path.join(out, "report.json")));
  assert.equal(summary.failed, 1);
  assert.equal(summary.answered, 0);
  assert.match(entries[0].error, /timeout|timed out|aborted/i);
});
