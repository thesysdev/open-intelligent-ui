import { defineFunction } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { CARDS, deckStats, findCard, ROLES } from "./cards";

/**
 * Card lookups the coach page computes with, so a deck held in a $variable
 * recomputes its elixir, cycle and warnings on every swap without another
 * message to the model.
 */

export const Card_ = defineFunction({
  name: "CardInfo",
  description:
    "One card's facts: {name, elixir, rarity, type (Troop, Spell, Building), targets (Ground, Air & ground, Buildings), flies, roles}; null for an unknown name",
  params: z.object({ name: z.string() }),
  returns: z.any(),
  fn: ({ name }) => findCard(name),
});

export const Elixir = defineFunction({
  name: "Elixir",
  description: "A card's elixir cost; null for an unknown name",
  params: z.object({ name: z.string() }),
  returns: z.number(),
  fn: ({ name }) => {
    const card = findCard(name);
    if (!card) throw new Error(`unknown card: ${name}`);
    return card.elixir;
  },
});

export const DeckStats = defineFunction({
  name: "DeckStats",
  description:
    "A deck's numbers from its card names: {count, avgElixir, cycle (cost of the 4 cheapest), style (Fast cycle, Balanced, Beatdown, Heavy beatdown), winConditions, spells, buildings, antiAir, splash, tanks (lists of names), warnings (plain-language problems), unknown}",
  params: z.object({ cards: z.array(z.string()) }),
  returns: z.any(),
  fn: ({ cards }) => deckStats(cards),
});

export const CardsWith = defineFunction({
  name: "CardsWith",
  description: `Names of cards that do a role, cheapest first, optionally at most maxElixir. Roles: ${ROLES.join(", ")}`,
  params: z.object({ role: z.string(), maxElixir: z.number().optional() }),
  returns: z.array(z.string()),
  fn: ({ role, maxElixir }) =>
    CARDS.filter((c) => c.roles.includes(role.toLowerCase()) && (maxElixir == null || c.elixir <= maxElixir))
      .sort((a, b) => a.elixir - b.elixir || a.name.localeCompare(b.name))
      .map((c) => c.name),
});

export const SwapCard = defineFunction({
  name: "SwapCard",
  description: "Copy of the deck with card out replaced by card in, in the same slot; unchanged if out is missing or in is already in the deck",
  params: z.object({ deck: z.array(z.string()), out: z.string(), in: z.string() }),
  returns: z.array(z.string()),
  fn: ({ deck, out, in: incoming }) => {
    if (deck.includes(incoming)) return deck;
    const i = deck.indexOf(out);
    return i < 0 ? deck : deck.map((c, j) => (j === i ? incoming : c));
  },
});

export const coachFunctions = [Card_, Elixir, DeckStats, CardsWith, SwapCard];
