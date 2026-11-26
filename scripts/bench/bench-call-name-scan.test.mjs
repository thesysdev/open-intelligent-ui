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

test("quoted text and comments do not become unknown function calls", async (t) => {
  const dir = temporary(t);
  const answers = path.join(dir, "answers");
  mkdirSync(answers);
  const cases = [
    `root = Col([Text('@Quoted')])`,
    `root = Col([Text("@Quoted")]) // @LineComment\n# @HashComment`,
    `root = Col([Text('escaped \\' @Quoted')])`,
    `root = Col([Text("https://example.com/#@Quoted")])`,
  ];
  for (const [index, program] of cases.entries()) {
    writeFileSync(path.join(answers, "bicycle.oui"), program.replaceAll("\\n", "\n"));
    const out = path.join(dir, String(index));
    const result = await run(["--answers", answers, "--only", "bicycle", "--no-shots", "--out", out]);
    assert.equal(result.code, 0, result.stderr);
    const { entries } = JSON.parse(readFileSync(path.join(out, "report.json")));
    assert.deepEqual(entries[0].check.unknownNames, [], program);
  }
  writeFileSync(path.join(answers, "bicycle.oui"), 'root = Col([Text(@ActualUnknown())])');
  const out = path.join(dir, "unknown");
  await run(["--answers", answers, "--only", "bicycle", "--no-shots", "--out", out]);
  assert.deepEqual(JSON.parse(readFileSync(path.join(out, "report.json"))).entries[0].check.unknownNames, ["ActualUnknown"]);
});
