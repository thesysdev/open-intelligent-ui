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
