import { describe, expect, it } from "vitest";
import { findCard } from "./cards";
import { answerQuality, ARCHETYPES, BASELINE_DECK, simulateDeck, simulateMatch, threatsOf } from "./sim";

const card = (name: string) => findCard(name)!;

describe("coach sim", () => {
  it("knows what threatens and what answers", () => {
    expect(threatsOf(card("Balloon")).sort()).toEqual(["air", "building-targeter"]);
    expect(threatsOf(card("Goblin Barrel"))).toContain("swarm");
    expect(answerQuality(card("Musketeer"), "air")).toBe(1);
    expect(answerQuality(card("Knight"), "air")).toBe(0);
    expect(answerQuality(card("Inferno Tower"), "tank")).toBe(1);
    expect(answerQuality(card("The Log"), "swarm")).toBe(1);
  });

  it("is repeatable for the same seed", () => {
    const deck = ["Hog Rider", "Musketeer", "Ice Golem", "Cannon", "Ice Spirit", "Skeletons", "Fireball", "The Log"];
    expect(simulateMatch(deck, ARCHETYPES[0], 42)).toEqual(simulateMatch(deck, ARCHETYPES[0], 42));
  });

  it("puts the baseline deck near 50%", () => {
    for (const r of simulateDeck(BASELINE_DECK)) {
      expect(r.winRate).toBeGreaterThan(35);
      expect(r.winRate).toBeLessThan(65);
    }
  });

  it("loses ground to air when anti-air is swapped out", () => {
    const withAir = ["Hog Rider", "Musketeer", "Ice Golem", "Cannon", "Ice Spirit", "Skeletons", "Fireball", "The Log"];
    const noAir = ["Hog Rider", "Knight", "Ice Golem", "Cannon", "Bomber", "Skeletons", "Fireball", "The Log"];
    const lava = (deck: string[]) => simulateDeck(deck, 150, 0, "Lava Loon")[0].winRate;
    expect(lava(withAir)).toBeGreaterThan(lava(noAir));
  });
});
