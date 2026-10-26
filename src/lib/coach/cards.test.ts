import { describe, expect, it } from "vitest";
import { CARDS, deckStats, findCard } from "./cards";
import { SwapCard } from "./functions";

describe("coach cards", () => {
  it("has unique names and sane costs", () => {
    expect(new Set(CARDS.map((c) => c.name)).size).toBe(CARDS.length);
    for (const c of CARDS) {
      expect(c.elixir).toBeGreaterThanOrEqual(1);
      expect(c.elixir).toBeLessThanOrEqual(9);
      expect(c.rarity && c.type && c.targets).toBeTruthy();
    }
  });

  it("finds cards by loose names and nicknames", () => {
    expect(findCard("hog rider")?.name).toBe("Hog Rider");
    expect(findCard("PEKKA")?.name).toBe("P.E.K.K.A");
    expect(findCard("mini pekka")?.name).toBe("Mini P.E.K.K.A");
    expect(findCard("Log")?.name).toBe("The Log");
    expect(findCard("Archer")?.name).toBe("Archers");
    expect(findCard("xbow")?.name).toBe("X-Bow");
    expect(findCard("Not A Card")).toBeNull();
  });

  it("scores Hog 2.6", () => {
    const s = deckStats(["Hog Rider", "Musketeer", "Ice Golem", "Cannon", "Ice Spirit", "Skeletons", "Fireball", "The Log"]);
    expect(s.avgElixir).toBe(2.6);
    expect(s.cycle).toBe(6);
    expect(s.style).toBe("Fast cycle");
    expect(s.winConditions).toEqual(["Hog Rider"]);
    expect(s.antiAir).toEqual(["Musketeer", "Ice Spirit"]);
    expect(s.warnings).toEqual([]);
  });

  it("warns about a deck with no win condition or spells", () => {
    const s = deckStats(["Knight", "Archers", "Valkyrie", "Musketeer", "Skeletons", "Bats", "Cannon", "Tesla"]);
    expect(s.warnings).toContain("No win condition");
    expect(s.warnings).toContain("No spell");
  });

  it("swaps a card in place", () => {
    const deck = ["Hog Rider", "Cannon", "Fireball"];
    expect(SwapCard.fn({ deck, out: "Cannon", in: "Tesla" })).toEqual(["Hog Rider", "Tesla", "Fireball"]);
    expect(SwapCard.fn({ deck, out: "Cannon", in: "Fireball" })).toEqual(deck);
  });
});
