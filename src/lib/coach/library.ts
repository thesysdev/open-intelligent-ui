import { library } from "../library";
import "./coach.css";
import { Arena, DeckSim, DeckSummary, ElixirMeter, GameCard } from "./components";
import { coachFunctions } from "./functions";

/** The chat library plus card tiles and deck math for the Clash Royale coach. */
export const coachLibrary = library.extend({
  components: { add: [GameCard, ElixirMeter, DeckSummary, DeckSim, Arena] },
  functions: { add: coachFunctions },
});

// The CLI (npm run prompt) picks up these exports by name.
export { coachPromptOptions } from "./prompt-options";
