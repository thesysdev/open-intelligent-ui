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

test("browser setup failure preserves answers and both reports", async (t) => {
  const dir = temporary(t), out = path.join(dir, "out");
  const result = await run(["--fake", "--only", "bicycle", "--out", out], { PLAYWRIGHT_CORE: path.join(dir, "missing.cjs") });
  assert.notEqual(result.code, 0);
  assert.equal(existsSync(path.join(out, "answers/bicycle.oui")), true);
  const { summary } = JSON.parse(readFileSync(path.join(out, "report.json")));
  assert.equal(summary.answered, 1);
  assert.match(summary.screenshotError, /Cannot find module/);
  assert.match(readFileSync(path.join(out, "report.md"), "utf8"), /Screenshots failed/);
});
test("preview failure closes the browser and retains failure evidence", async (t) => {
  const dir = temporary(t), out = path.join(dir, "out"), closed = path.join(dir, "closed");
  const fixture = path.join(dir, "browser.cjs");
  writeFileSync(fixture, `module.exports = { chromium: { launch: async () => ({
    newPage: async () => ({ on() {}, async addInitScript() {}, async goto() { throw new Error("preview timed out"); } }),
    close: async () => require("node:fs").writeFileSync(${JSON.stringify(closed)}, "closed"),
  }) } };`);
  const result = await run(["--fake", "--only", "bicycle", "--out", out], { PLAYWRIGHT_CORE: fixture });
  assert.notEqual(result.code, 0);
  assert.equal(existsSync(closed), true);
  assert.equal(JSON.parse(readFileSync(path.join(out, "report.json"))).summary.screenshotError, "preview timed out");
});
