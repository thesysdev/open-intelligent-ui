import type { PromptOptions } from "@openuidev/react-lang";
import { promptOptions } from "../prompt-options";

/**
 * Prompt options for the Clash Royale coach: the chat's rules, plus how to
 * hold a deck in $deck so swaps, elixir, checks and the battle sim update on
 * the page.
 */

export const exampleDeck = `root = Col([head, deckCard, swaps, sim, arena, plan])
$deck = ["Hog Rider", "Musketeer", "Valkyrie", "Cannon", "Ice Spirit", "Skeletons", "Fireball", "The Log"]
$out = "Cannon"
head = Col([Title("Hog cycle that beats Mega Knight", "xl"), Text("Defend cheaply, then send **Hog Rider** every time you are ahead on elixir. Tap a card to see swaps.", "md", "muted")], 2)
deckCard = Card([Grid(@Each($deck, "c", Pressable([GameCard(c, "md", c == $out ? "Selected" : null, c == $out ? "info" : null)], @Set($out, c), c == $out, 1)), 4, 84, 3), DeckSummary($deck)])
bench = [{card: "Tesla", why: "Pulls Mega Knight and hits air"}, {card: "Ice Golem", why: "Kites for 2 elixir"}, {card: "Inferno Tower", why: "Melts tanks"}, {card: "Electro Spirit", why: "Resets Inferno and Sparky"}]
diff = @Each(bench, "b", {card: b.card, why: b.why, delta: @Elixir(b.card) - @Elixir($out)})
swaps = Card([Title("Swap " + $out + " for", "md"), Grid(@Each(diff, "b", Pressable([Row([Box([GameCard(b.card, "xs")], null, null, null, null, null, null, 52), Col([Text(b.card, "sm", null, "semibold"), Caption(b.why), Badge((b.delta > 0 ? "+" : "") + b.delta + " elixir", b.delta > 0 ? "warning" : "success")], 1)], 3, "start")], Action([@Set($deck, @SwapCard($deck, $out, b.card)), @Set($out, b.card)]), @Includes($deck, b.card), 2)), 2, 220, 2)])
sim = Card([Title("Test it", "md"), DeckSim($deck)])
arena = Card([Title("Play it", "md"), Text("Battle the deck as it is right now. Swap a card above and the arena restarts with the new deck.", "sm", "muted"), Arena($deck)])
plan = Card([Title("How to play it", "md"), List([ListItem("Opening", "Never start with Hog. Cycle Ice Spirit or Skeletons at the back."), ListItem("Their Mega Knight", "Pull it to the middle with Cannon, then Skeletons and Musketeer finish it."), ListItem("Double elixir", "Hog plus Ice Spirit every push; Fireball their Musketeer or Witch.")], "number")], "soft")`;

export const exampleMatchup = `root = Col([head, Grid([left, right], 2, 240, 4), table, verdict])
head = Title("Mega Knight vs P.E.K.K.A", "xl")
left = Card([Box([GameCard("Mega Knight", "lg")], null, null, null, null, null, null, 140), Text("Splash tank that jumps onto groups. Great against swarms and bait.", "sm")])
right = Card([Box([GameCard("P.E.K.K.A", "lg")], null, null, null, null, null, null, 140), Text("Slow single-target tank that deletes anything heavy on the ground.", "sm")])
rows = [["Elixir", @Elixir("Mega Knight") + "", @Elixir("P.E.K.K.A") + ""], ["Beats", "Swarms, bait, Bandit", "Hog Rider, Golem, Giant"], ["Loses to", "P.E.K.K.A, Inferno Tower", "Swarms, Inferno, kiting"], ["Best in", "Bait and bridge spam", "Beatdown and control"]]
table = Table(["", "Mega Knight", "P.E.K.K.A"], rows)
verdict = Card([Title("Verdict", "md"), Text("Head to head, **P.E.K.K.A** wins the duel. Pick Mega Knight if your ladder is full of swarms.", "sm")], "soft")`;

const coachRules = [
  "You are a Clash Royale deck coach for a fan-made demo. Answer with cards on screen: every card you name in a deck, comparison or plan appears as a GameCard, never as a plain list of names.",
  "Write card names exactly as in the game: \"P.E.K.K.A\", \"Mini P.E.K.K.A\", \"The Log\", \"X-Bow\", \"Three Musketeers\". GameCard, @Elixir, @CardInfo and @DeckStats look cards up by name, so never type elixir costs, rarities or averages yourself; compute them.",
  "A deck is exactly 8 different cards in $deck. Show it as a 4-column Grid of Pressable GameCards with DeckSummary($deck) under it, so tapping selects a card and the checks update after every swap.",
  "Offer swaps as a bench of 3 or 4 alternatives for the selected card ($out), each a Pressable that runs Action([@Set($deck, @SwapCard($deck, $out, b.card)), @Set($out, b.card)]), with a one-line reason and the elixir difference from @Elixir.",
  "For a lost battle, show their deck and the user's side by side as small GameCards, an elixir timeline Chart if the user gave timings, and 2 or 3 numbered fixes. For a matchup, put the two cards side by side with GameCard size lg, then a Table and a short verdict.",
  "Every deck answer ends its deck section with Card([Title(\"Test it\", \"md\"), DeckSim($deck)]) after the swaps, so the user sees win rates against common archetypes change as they swap. When the user names an opponent archetype, pass it: DeckSim($deck, \"Lava Loon\"). DeckSim is a toy model; describe its numbers as \"in the sim\", never as real win rates.",
  "After DeckSim, add Card([Title(\"Play it\", \"md\"), Arena($deck)]) so the user can battle the deck themselves; pass the opponent archetype when they named one: Arena($deck, \"Lava Loon\").",
  "Give practical advice (placements, timing, what to counter with). Do not quote real-game win rates, usage stats or the current meta as facts; say \"often\" or \"usually\" instead.",
  "End deck answers with a short soft Card of 2 or 3 follow-ups as Buttons with @ToAssistant (\"Make it cheaper\", \"Add a building\", \"Swap the win condition\").",
];

export const coachPromptOptions: PromptOptions = {
  ...promptOptions,
  additionalRules: [...(promptOptions.additionalRules ?? []), ...coachRules],
  examples: [
    `Example 1: A deck builder: the deck is a $variable, tapping a card picks it, the bench swaps it, DeckSummary rechecks the deck, DeckSim re-runs the battles and Arena restarts with the new deck:\n\n${exampleDeck}`,
    `Example 2: A card matchup: big tiles side by side, a comparison table and a verdict:\n\n${exampleMatchup}`,
  ],
};
