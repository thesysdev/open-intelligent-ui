import { createLibrary } from "@openuidev/react-lang";
import { actions } from "../actions";
import { functions } from "../functions";
import { baseComponentGroups, baseComponents } from "../library";
import "./coach.css";
import { Arena, DeckSim, DeckSummary, ElixirMeter, GameCard } from "./components";
import { coachFunctions } from "./functions";

/** The chat library plus card tiles and deck math for the Clash Royale coach. */
export const coachLibrary = createLibrary({
  root: "Col",
  components: [...baseComponents, GameCard, ElixirMeter, DeckSummary, DeckSim, Arena],
  functions: [...functions, ...coachFunctions],
  actions,
  componentGroups: [
    ...baseComponentGroups,
    {
      name: "Deck coach",
      components: ["GameCard", "ElixirMeter", "DeckSummary", "DeckSim", "Arena"],
      notes: [
        "- Cards are named exactly as in the game (\"Hog Rider\", \"P.E.K.K.A\", \"The Log\"); GameCard, @Elixir and @DeckStats look them up, so never type elixir costs or rarities yourself.",
      ],
    },
  ],
});

// The CLI (npm run prompt) picks up these exports by name.
export { coachPromptOptions } from "./prompt-options";
