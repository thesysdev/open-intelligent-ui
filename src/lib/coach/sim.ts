/**
 * A toy battle simulator for the coach: elixir, a cycling 4-card hand and
 * rules of thumb about which cards answer which threats. It is not the game
 * engine and its numbers are not real match data; it is a quick, repeatable
 * way to see how a swap changes a deck's answers to common archetypes.
 *
 * Each run plays a 3-minute match against one archetype, second by second.
 * Both sides earn elixir at the game's rate (double after 2 minutes). The
 * opponent pushes when it can pay for its next push; the player defends with
 * whatever is in hand and affordable, and attacks when a win condition is in
 * hand with 2 elixir to spare. An attack lands more often when the opponent
 * is short on elixir to answer it. The same
 * deck, archetype and seed always give the same result.
 */

import { findCard, type GameCardInfo } from "./cards";

export type Threat = "building-targeter" | "air" | "tank" | "swarm" | "siege" | "spell-bait";

export interface Archetype {
  name: string;
  /** Pushes the opponent cycles through; each is one or two cards played together. */
  pushes: string[][];
}

export const ARCHETYPES: Archetype[] = [
  { name: "Hog Cycle", pushes: [["Hog Rider", "Ice Spirit"], ["Hog Rider", "Musketeer"], ["Ice Golem", "Hog Rider"]] },
  { name: "Golem Beatdown", pushes: [["Golem", "Night Witch"], ["Golem", "Baby Dragon"], ["Lumberjack", "Night Witch"]] },
  { name: "Lava Loon", pushes: [["Lava Hound", "Balloon"], ["Balloon", "Minions"], ["Lava Hound", "Mega Minion"]] },
  { name: "Log Bait", pushes: [["Goblin Barrel"], ["Princess", "Knight"], ["Goblin Gang", "Goblin Barrel"]] },
  { name: "X-Bow Siege", pushes: [["X-Bow", "Archers"], ["X-Bow", "Tesla"], ["Skeletons", "Ice Golem"]] },
  { name: "Mega Knight", pushes: [["Mega Knight", "Bats"], ["Bandit", "Ram Rider"], ["Mega Knight", "Royal Ghost"]] },
  { name: "P.E.K.K.A Bridge Spam", pushes: [["P.E.K.K.A", "Battle Ram"], ["Bandit", "Electro Wizard"], ["Battle Ram", "Royal Ghost"]] },
  { name: "Graveyard", pushes: [["Graveyard", "Ice Wizard"], ["Graveyard", "Knight"], ["Baby Dragon", "Tornado"]] },
];

const TANK_KILLERS = new Set([
  "Inferno Tower", "Inferno Dragon", "Mini P.E.K.K.A", "P.E.K.K.A", "Hunter", "Prince", "Lumberjack", "Skeleton Army",
  "Guards", "Barbarians", "Elite Barbarians", "Minion Horde", "Golden Knight", "Mighty Miner", "Cannon Cart", "Royal Recruits",
  "Electro Giant", "Goblin Machine", "Boss Bandit", "Sparky", "Executioner",
]);
const SIEGE = new Set(["X-Bow", "Mortar"]);
const SWARM_SPELLS = new Set(["Goblin Barrel", "Graveyard"]);
const BAIT = new Set(["Goblin Barrel", "Princess", "Goblin Gang", "Dart Goblin", "Skeleton Barrel", "Bats", "Minion Horde"]);

/** What a card brings when it attacks. */
export function threatsOf(card: GameCardInfo): Threat[] {
  const t = new Set<Threat>();
  if (card.targets === "Buildings") t.add("building-targeter");
  if (card.flies) t.add("air");
  if (card.roles.includes("tank")) t.add("tank");
  if (card.roles.includes("swarm") || SWARM_SPELLS.has(card.name)) t.add("swarm");
  if (SIEGE.has(card.name)) t.add("siege");
  if (BAIT.has(card.name)) t.add("spell-bait");
  return [...t];
}

/** How well a card answers a threat: 1 is a clean counter, 0.5 helps, 0 does nothing. */
export function answerQuality(card: GameCardInfo, threat: Threat): number {
  const hitsAir = card.type !== "Spell" && card.targets === "Air & ground";
  const splash = card.roles.includes("splash") || card.roles.includes("small spell") || card.roles.includes("big spell");
  const building = card.roles.includes("defensive building");
  const tanky = card.roles.includes("tank") || card.roles.includes("mini tank");
  switch (threat) {
    case "air":
      return hitsAir ? (card.roles.includes("anti-air") ? 1 : 0.6) : card.type === "Spell" && card.roles.includes("big spell") ? 0.4 : 0;
    case "swarm":
      return splash ? 1 : card.roles.includes("swarm") ? 0.5 : 0;
    case "tank":
      return TANK_KILLERS.has(card.name) ? 1 : building ? 0.6 : card.roles.includes("swarm") ? 0.5 : 0;
    case "building-targeter":
      return building || TANK_KILLERS.has(card.name) ? 1 : tanky ? 0.7 : card.roles.includes("cycle") || card.roles.includes("reset") ? 0.4 : 0;
    case "siege":
      return card.roles.includes("big spell") || card.name === "Miner" || card.name === "Goblin Drill" ? 1 : tanky ? 0.7 : card.roles.includes("win condition") ? 0.4 : 0;
    case "spell-bait":
      return card.roles.includes("small spell") ? 1 : splash ? 0.6 : 0;
  }
}

/** A small seeded random generator (mulberry32), so a deck's results are repeatable. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface SimEvent {
  t: number;
  kind: "defend" | "attack";
  /** The opponent's push (defend) or the player's win condition (attack). */
  cards: string[];
  /** The player's hand when the event started. */
  hand: string[];
  /** Cards the player spent. */
  played: string[];
  elixir: number;
  success: boolean;
  damage: number;
  note: string;
}

export interface SimRun {
  /** Tower damage the player dealt and took, in % of one tower. */
  dealt: number;
  taken: number;
  events: SimEvent[];
}

const MATCH_SECONDS = 180;
const REGEN = 1 / 2.8;

/** One match of the deck against an archetype. Both sides earn elixir at the game's rate. */
export function simulateMatch(deckNames: string[], archetype: Archetype, seed: number): SimRun {
  const r = rng(seed);
  const deck = deckNames.map(findCard).filter((c): c is GameCardInfo => !!c);
  const queue = [...deck].sort(() => r() - 0.5);
  const hand = queue.splice(0, 4);
  const wins = deck.filter((c) => c.roles.includes("win condition"));
  const hasBigSpell = deck.some((c) => c.roles.includes("big spell"));
  const events: SimEvent[] = [];

  let elixir = 5;
  let opp = 5;
  let mine = 0; // damage the player dealt, in % of a tower
  let theirs = 0; // damage the player took
  let push = Math.floor(r() * archetype.pushes.length);
  let lastAttack = -99;
  let lastPush = -99;
  let pending = archetype.pushes[push];
  const costOf = (names: string[]) => names.reduce((s, n) => s + (findCard(n)?.elixir ?? 0), 0);

  const play = (card: GameCardInfo) => {
    elixir -= card.elixir;
    hand.splice(hand.indexOf(card), 1);
    queue.push(card);
    hand.push(queue.shift()!);
  };

  for (let t = 1; t <= MATCH_SECONDS; t++) {
    const rate = (t > 120 ? 2 : 1) * REGEN;
    elixir = Math.min(10, elixir + rate);
    opp = Math.min(10, opp + rate);

    // The opponent pushes once it can pay for its next push. A push over 10
    // elixir (Golem + Night Witch) starts at 9.5 and borrows the rest from
    // the elixir it earns next, as a player would drop the second card later.
    if (opp >= Math.min(costOf(pending), 9.5) && t - lastPush >= 6) {
      opp -= costOf(pending);
      lastPush = t;
      const cards = pending;
      pending = archetype.pushes[++push % archetype.pushes.length];
      const pushCards = cards.map(findCard).filter((c): c is GameCardInfo => !!c);
      const threats = [...new Set(pushCards.flatMap(threatsOf))];
      // A threat that only comes from the air (Balloon, Lava Hound) needs an answer that hits air.
      const airborne = new Set(threats.filter((th) => pushCards.filter((c) => threatsOf(c).includes(th)).every((c) => c.flies)));
      const q = (c: GameCardInfo, th: Threat) => (airborne.has(th) && c.targets !== "Air & ground" ? 0 : answerQuality(c, th));
      const before = hand.map((c) => c.name);
      const startElixir = elixir;
      const played: GameCardInfo[] = [];
      let budget = elixir;
      let covered = 0;
      for (const threat of threats) {
        // Best affordable answer in hand; a card already chosen for this push still counts.
        const reuse = Math.max(0, ...played.map((c) => q(c, threat)));
        const pick = hand
          .filter((c) => !played.includes(c) && c.elixir <= budget && q(c, threat) > reuse)
          // Prefer a clean answer, but not at any price: each elixir costs a little.
          .sort((x, y) => q(y, threat) - 0.08 * y.elixir - (q(x, threat) - 0.08 * x.elixir))[0];
        if (pick) {
          played.push(pick);
          budget -= pick.elixir;
          covered += q(pick, threat);
        } else covered += reuse;
      }
      for (const c of played) play(c);
      const quality = threats.length ? covered / threats.length : 1;
      const success = r() < 0.2 + 0.75 * quality;
      // A push that gets through does damage in line with what it cost.
      const big = threats.includes("building-targeter") || threats.includes("siege");
      const damage = success ? 0 : Math.round(costOf(cards) * (2.4 + r() * 1.6) + (big ? 4 : 0));
      theirs += damage;
      const missing = threats.filter((th) => !played.some((c) => q(c, th) >= 0.6));
      events.push({
        t,
        kind: "defend",
        cards,
        hand: before,
        played: played.map((c) => c.name),
        elixir: Math.round(startElixir * 10) / 10,
        success,
        damage,
        note: success
          ? played.length
            ? `Held with ${played.map((c) => c.name).join(" + ")}`
            : "Tower soaked it"
          : missing.length
            ? `No answer in hand for ${missing.join(" and ")}`
            : "The answer was there, but the push got through",
      });
      continue;
    }

    // The player attacks with a win condition in hand, keeping up to 2 elixir back to defend.
    const attacker = hand.filter((c) => wins.includes(c) && c.elixir + Math.min(2, 10 - c.elixir) <= elixir).sort((x, y) => x.elixir - y.elixir)[0];
    if (attacker && t - lastAttack >= 8) {
      lastAttack = t;
      const handBefore = hand.map((c) => c.name);
      const spent = elixir;
      play(attacker);
      // Back it with a spell or a support troop if one is in hand and affordable.
      const support = hand
        .filter((c) => !c.roles.includes("win condition") && c.elixir + 1 <= elixir && (c.type === "Spell" || c.roles.includes("support") || c.roles.includes("splash")))
        .sort((x, y) => Number(y.type === "Spell") - Number(x.type === "Spell") || x.elixir - y.elixir)[0];
      if (support) play(support);
      const used = support ? [attacker.name, support.name] : [attacker.name];
      // The opponent answers for about the push's cost; short on elixir, it can't.
      const answer = Math.max(2, attacker.elixir + (support ? support.elixir : 0) - 2);
      const caught = opp < answer;
      opp = Math.max(0, opp - answer);
      const heavy = attacker.roles.includes("tank");
      const chance = 0.3 + (caught ? 0.25 : 0) + (support ? 0.12 : 0) + (heavy ? 0.08 : 0) + (hasBigSpell ? 0.04 : 0) + (t > 120 ? 0.05 : 0);
      const hit = r() < chance;
      // A spell chips the tower even when the push is stopped.
      const chip = support?.type === "Spell" && support.roles.includes("big spell") ? Math.round(support.elixir * 1.5) : 0;
      const dmg = (hit ? Math.round(attacker.elixir * (3 + r() * 2) + 4) : 0) + chip;
      mine += dmg;
      events.push({
        t,
        kind: "attack",
        cards: used,
        hand: handBefore,
        played: used,
        elixir: Math.round(spent * 10) / 10,
        success: hit,
        damage: dmg,
        note: hit ? (caught ? `${used.join(" + ")} caught them short on elixir` : `${used.join(" + ")} connected`) : chip ? `Defended, ${support!.name} chipped the tower` : `${attacker.name} was defended`,
      });
      continue;
    }

    // Sitting on full elixir wastes it: cycle the cheapest card toward the win condition.
    if (elixir >= 9.5 && !hand.some((c) => wins.includes(c))) {
      const filler = hand.filter((c) => !c.roles.includes("win condition")).sort((x, y) => x.elixir - y.elixir)[0];
      if (filler) play(filler);
    }
  }

  return { dealt: mine, taken: theirs, events };
}

export interface MatchupResult {
  archetype: string;
  winRate: number;
  wins: number;
  losses: number;
  draws: number;
  /** The opponent push that got through most often. */
  worstPush: { cards: string[]; failRate: number; reason: string } | null;
  /** The player's card that defended most often. */
  bestDefender: string | null;
  sample: SimRun;
  sampleResult: "win" | "loss" | "draw";
}

/**
 * The yardstick: a middle-of-the-road ladder deck. The model is crude, so
 * rather than call a raw damage race a win, a match counts as a win when the
 * deck's damage margin beats this deck's average margin against the same
 * archetype. A typical deck lands near 50%; better answers move it up.
 */
export const BASELINE_DECK = ["Giant", "Musketeer", "Mini P.E.K.K.A", "Valkyrie", "Baby Dragon", "Fireball", "Zap", "Skeletons"];
const RUNS = 150;
const baselineCache = new Map<string, number>();

function baselineMargin(archetype: Archetype) {
  let margin = baselineCache.get(archetype.name);
  if (margin === undefined) {
    let sum = 0;
    for (let i = 0; i < RUNS; i++) {
      const run = simulateMatch(BASELINE_DECK, archetype, hash(`baseline#${archetype.name}#${i}`));
      sum += run.dealt - run.taken;
    }
    margin = sum / RUNS;
    baselineCache.set(archetype.name, margin);
  }
  return margin;
}

/** Win, loss or draw for one run, measured against the baseline deck. */
export function outcome(run: SimRun, archetype: Archetype): "win" | "loss" | "draw" {
  const edge = run.dealt - run.taken - baselineMargin(archetype);
  return edge > 4 ? "win" : edge < -4 ? "loss" : "draw";
}

/** Many matches of the deck against each archetype. */
export function simulateDeck(deckNames: string[], runs = RUNS, salt = 0, only?: string): MatchupResult[] {
  const key = deckNames.join("|");
  return ARCHETYPES.filter((a) => !only || a.name === only).map((archetype) => {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    const pushStats = new Map<string, { cards: string[]; seen: number; failed: number; reasons: Map<string, number> }>();
    const defenders = new Map<string, number>();
    let sample: SimRun | null = null;
    let sampleResult: "win" | "loss" | "draw" = "draw";
    for (let i = 0; i < runs; i++) {
      const run = simulateMatch(deckNames, archetype, hash(`${key}#${archetype.name}#${salt}#${i}`));
      const result = outcome(run, archetype);
      if (!sample) {
        sample = run;
        sampleResult = result;
      }
      if (result === "win") wins++;
      else if (result === "loss") losses++;
      else draws++;
      for (const e of run.events) {
        if (e.kind !== "defend") continue;
        const id = e.cards.join(" + ");
        const st = pushStats.get(id) ?? { cards: e.cards, seen: 0, failed: 0, reasons: new Map() };
        st.seen++;
        if (!e.success) {
          st.failed++;
          st.reasons.set(e.note, (st.reasons.get(e.note) ?? 0) + 1);
        } else for (const c of e.played) defenders.set(c, (defenders.get(c) ?? 0) + 1);
        pushStats.set(id, st);
      }
    }
    const worst = [...pushStats.values()].sort((x, y) => y.failed / y.seen - x.failed / x.seen)[0];
    const reason = worst ? ([...worst.reasons.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "") : "";
    return {
      archetype: archetype.name,
      winRate: Math.round(((wins + draws / 2) / runs) * 100),
      wins,
      losses,
      draws,
      worstPush: worst && worst.failed ? { cards: worst.cards, failRate: Math.round((worst.failed / worst.seen) * 100), reason } : null,
      bestDefender: [...defenders.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null,
      sample: sample!,
      sampleResult,
    };
  });
}
