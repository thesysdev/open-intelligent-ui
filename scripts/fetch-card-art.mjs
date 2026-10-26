// Copies Clash Royale card images for the /clash demo into public/cards/
// (gitignored), named by the card's slug, e.g. public/cards/hog-rider.png.
//
// Source: RoyaleAPI's cr-api-assets repository, cloned as that repo asks
// rather than hot-linked. The art is Supercell's, used under Supercell's Fan
// Content Policy (https://supercell.com/en/fan-content-policy/); it is not
// committed here. Without these files GameCard falls back to a monogram tile.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const out = join(root, "public", "cards");
const table = readFileSync(join(root, "src/lib/coach/cards.ts"), "utf8").split("const TABLE = `")[1].split("`")[0];
const names = table.trim().split("\n").map((line) => line.split("|")[0]);
const slug = (name) => name.toLowerCase().replace(/\./g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const tmp = mkdtempSync(join(tmpdir(), "cr-assets-"));
try {
  const git = (...args) => execFileSync("git", args, { cwd: tmp, stdio: "inherit" });
  git("clone", "--quiet", "--depth", "1", "--filter=blob:none", "--sparse", "https://github.com/RoyaleAPI/cr-api-assets", "repo");
  execFileSync("git", ["sparse-checkout", "set", "cards-150"], { cwd: join(tmp, "repo"), stdio: "inherit" });
  mkdirSync(out, { recursive: true });
  const missing = [];
  for (const name of names) {
    const file = join(tmp, "repo", "cards-150", `${slug(name)}.png`);
    if (existsSync(file)) copyFileSync(file, join(out, `${slug(name)}.png`));
    else missing.push(name);
  }
  console.log(`Copied ${names.length - missing.length} of ${names.length} card images to public/cards/`);
  if (missing.length) console.log(`No image for: ${missing.join(", ")}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
