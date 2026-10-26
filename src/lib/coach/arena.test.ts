import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CARDS, findCard } from "./cards";
import { ARCHETYPES } from "./sim";

// public/arena/cards.js runs inside the arena's iframe, where it cannot import
// the card table, so it keeps its own copies. These checks keep them in step.
type ArenaData = { CARD_STATS: Record<string, unknown[]>; CARD_COST: Record<string, number>; ARCHETYPE_DECKS: Record<string, string[]> };
const arena = {} as ArenaData;
new Function("window", readFileSync(join(process.cwd(), "public/arena/cards.js"), "utf8"))(arena);

describe("arena card data", () => {
  it("costs every card the same as the coach's table", () => {
    const costs = Object.fromEntries(CARDS.map((c) => [c.name, c.elixir]));
    expect(arena.CARD_COST).toEqual(costs);
  });

  it("has stats for every card", () => {
    expect(CARDS.map((c) => c.name).filter((n) => !arena.CARD_STATS[n])).toEqual([]);
  });

  it("offers the same opponents as the simulator, each a legal deck", () => {
    expect(Object.keys(arena.ARCHETYPE_DECKS)).toEqual(ARCHETYPES.map((a) => a.name));
    for (const [name, deck] of Object.entries(arena.ARCHETYPE_DECKS)) {
      expect(new Set(deck).size, name).toBe(8);
      expect(deck.filter((c) => findCard(c)?.name !== c), name).toEqual([]);
    }
  });
});

// Runs public/arena/game.js against a stub canvas and steps it by hand.
function loadArena(hash: string) {
  const noop = () => {};
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get: (t, k) => (k in t ? t[k] : k === "createLinearGradient" ? () => ({ addColorStop: noop }) : k === "measureText" ? () => ({ width: 0 }) : noop),
    set: (t, k, v) => ((t[k] = v), true),
  });
  const canvas = { getContext: () => ctx, parentElement: { getBoundingClientRect: () => ({ width: 360, height: 800 }) }, addEventListener: noop, style: {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  const win = {} as ArenaData & { addEventListener: () => void; __arena: { G: any; playCard: (team: number, i: number, x: number, y: number) => boolean; step: (dt: number) => void } };
  win.addEventListener = noop;
  const env = { window: win, document: { getElementById: () => canvas }, location: { hash: "#" + hash }, performance: { now: () => 0 }, requestAnimationFrame: noop, parent: { postMessage: noop }, Image: class {} };
  const run = (file: string) => new Function(...Object.keys(env), readFileSync(join(process.cwd(), "public/arena", file), "utf8"))(...Object.values(env));
  run("cards.js");
  Object.assign(env, { CARD_STATS: win.CARD_STATS, TOWER_STATS: (win as any).TOWER_STATS, ARCHETYPE_DECKS: win.ARCHETYPE_DECKS, CARD_COST: win.CARD_COST });
  run("game.js");
  return win.__arena;
}

describe("arena rules", () => {
  const deck = "Cannon,Knight,Archers,Fireball,Skeletons,Musketeer,Giant,Zap";

  it("deploys troops for a second, and buildings lose hit points until they expire", () => {
    const { G, playCard, step } = loadArena(`deck=${deck}&opp=Hog Cycle&seed=3`);
    G.players[1].ai = false;
    const p = G.players[0];
    p.hand = ["Cannon", "Knight", "Archers", "Zap"];
    p.elixir = 10;
    expect(playCard(0, 0, 9, 22)).toBe(true);
    p.hand[1] = "Knight";
    expect(playCard(0, 1, 4, 24)).toBe(true);
    const cannon = G.units.find((u: { name: string }) => u.name === "Cannon");
    const knight = G.units.find((u: { name: string }) => u.name === "Knight");
    const at = { x: knight.x, y: knight.y };
    for (let i = 0; i < 36; i++) step(0.025);
    expect([knight.x, knight.y]).toEqual([at.x, at.y]);
    for (let i = 0; i < 40 * 15; i++) step(0.025);
    expect(cannon.hp).toBeLessThan(cannon.maxHp * 0.6);
    for (let i = 0; i < 40 * 17; i++) step(0.025);
    expect(cannon.dead).toBe(true);
  });

  it("only lets the opponent spend the elixir it has made", () => {
    const { G, step } = loadArena(`deck=${deck}&opp=Golem Beatdown&auto=1&seed=5`);
    const spent = [0, 0];
    for (let i = 0; i < 40 * 120 && !G.over; i++) {
      const before = G.players.map((p: { elixir: number }) => p.elixir);
      step(0.025);
      G.players.forEach((p: { elixir: number }, k: number) => { if (p.elixir < before[k] - 0.5) spent[k] += before[k] - p.elixir; });
    }
    // 5 to start, then one every 2.8 s for the first two minutes.
    expect(spent[1]).toBeLessThanOrEqual(5 + 120 / 2.8 + 0.5);
  });
});
