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

test("invalid selectors and numeric options fail before creating output", async (t) => {
  const dir = temporary(t);
  const invalid = [["--only", "unknown"], ["--only", ""], ["--kind", "tools"],
    ["--only", "bicycle", "--kind", "dashboard"], ["--concurrency", "0"],
    ["--concurrency", "NaN"], ["--concurrency", "1.5"], ["--max-tokens", "-1"],
    ["--max-tokens", "Infinity"], ["--widths", "390,0"], ["--widths", ""],
    ["--temperature", "NaN"], ["--temperature", ""]];
  for (const [index, args] of invalid.entries()) {
    const out = path.join(dir, String(index));
    const result = await run(["--fake", "--no-shots", "--out", out, ...args]);
    assert.notEqual(result.code, 0, args.join(" "));
    assert.equal(existsSync(out), false, `invalid args created output: ${args.join(" ")}`);
  }
});
test("trimmed ids and valid numeric options retain a real parser result", async (t) => {
  const out = path.join(temporary(t), "out");
  const result = await run(["--fake", "--no-shots", "--only", " bicycle , bill ", "--out", out,
    "--concurrency", "1", "--max-tokens", "1", "--temperature", "0", "--widths", "390,1280"]);
  assert.equal(result.code, 0, result.stderr);
  const { summary } = JSON.parse(readFileSync(path.join(out, "report.json")));
  assert.equal(summary.answered, 2);
  assert.equal(summary.parseClean, 2);
});
