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

test("invalid programs and zero answers fail after durable reports", async (t) => {
  const dir = temporary(t), answers = path.join(dir, "answers");
  mkdirSync(answers);
  for (const [name, program] of [["unknown", 'root = Col([Text(@NotInLibrary())])'], ["empty", ""]]) {
    writeFileSync(path.join(answers, "bicycle.oui"), program);
    const out = path.join(dir, name);
    const result = await run(["--answers", answers, "--only", "bicycle", "--no-shots", "--out", out]);
    assert.notEqual(result.code, 0, name);
    assert.equal(existsSync(path.join(out, "report.json")), true);
    assert.equal(existsSync(path.join(out, "report.md")), true);
  }
  const missing = path.join(dir, "missing"); mkdirSync(missing);
  const out = path.join(dir, "skipped");
  assert.notEqual((await run(["--answers", missing, "--only", "bicycle", "--no-shots", "--out", out])).code, 0);
  assert.equal(JSON.parse(readFileSync(path.join(out, "report.json"))).summary.answered, 0);
});
test("a valid real-parser result still exits successfully", async (t) => {
  const out = path.join(temporary(t), "out");
  const result = await run(["--fake", "--only", "bicycle", "--no-shots", "--out", out]);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(readFileSync(path.join(out, "report.json"))).summary.parseClean, 1);
});
