/**
 * A fan-made table of Clash Royale cards for the coach demo: name, elixir,
 * rarity, type, what it targets and the jobs it does in a deck. Hand-written
 * from public knowledge of the game, so it can lag balance changes and new
 * releases. Names only: no Supercell art, logos or other assets.
 */

export type Rarity = "Common" | "Rare" | "Epic" | "Legendary" | "Champion";
export type CardType = "Troop" | "Spell" | "Building";
export type Targets = "Ground" | "Air & ground" | "Buildings";

export interface GameCardInfo {
  name: string;
  elixir: number;
  rarity: Rarity;
  type: CardType;
  targets: Targets;
  flies: boolean;
  roles: string[];
}

/** The jobs a card can do, as written in the table below. */
export const ROLES = [
  "win condition",
  "tank",
  "mini tank",
  "splash",
  "anti-air",
  "swarm",
  "cycle",
  "big spell",
  "small spell",
  "defensive building",
  "support",
  "reset",
  "spawner",
] as const;

const RARITY: Record<string, Rarity> = { C: "Common", R: "Rare", E: "Epic", L: "Legendary", H: "Champion" };
const TYPE: Record<string, CardType> = { T: "Troop", S: "Spell", B: "Building" };
const TARGETS: Record<string, Targets> = { G: "Ground", A: "Air & ground", B: "Buildings" };

// name | elixir | rarity | type | targets | flies | roles
const TABLE = `
Knight|3|C|T|G|0|mini tank
Archers|3|C|T|A|0|anti-air,support
Bomber|2|C|T|G|0|splash
Goblins|2|C|T|G|0|swarm,cycle
Spear Goblins|2|C|T|A|0|swarm,anti-air,cycle
Skeletons|1|C|T|G|0|swarm,cycle
Minions|3|C|T|A|1|anti-air,swarm
Minion Horde|5|C|T|A|1|anti-air,swarm
Barbarians|5|C|T|G|0|swarm
Elite Barbarians|6|C|T|G|0|support
Royal Giant|6|C|T|B|0|win condition,tank
Firecracker|3|C|T|A|0|splash,anti-air,support
Royal Recruits|7|C|T|G|0|swarm,mini tank
Skeleton Barrel|3|C|T|G|1|win condition,swarm
Goblin Gang|3|C|T|A|0|swarm,anti-air
Bats|2|C|T|A|1|anti-air,swarm,cycle
Electro Spirit|1|C|T|A|0|cycle,reset
Fire Spirit|1|C|T|A|0|cycle,splash
Ice Spirit|1|C|T|A|0|cycle
Skeleton Dragons|4|C|T|A|1|splash,anti-air
Rascals|5|C|T|A|0|mini tank,anti-air
Berserker|2|C|T|G|0|cycle
Arrows|3|C|S|A|0|small spell
Zap|2|C|S|A|0|small spell,reset
Giant Snowball|2|C|S|A|0|small spell
Royal Delivery|3|C|S|G|0|small spell
Cannon|3|C|B|G|0|defensive building
Mortar|4|C|B|G|0|win condition,defensive building
Tesla|4|C|B|A|0|defensive building
Musketeer|4|R|T|A|0|anti-air,support
Valkyrie|4|R|T|G|0|splash,mini tank
Mini P.E.K.K.A|4|R|T|G|0|support
Hog Rider|4|R|T|B|0|win condition
Giant|5|R|T|B|0|win condition,tank
Wizard|5|R|T|A|0|splash,anti-air,support
Battle Ram|4|R|T|B|0|win condition
Ice Golem|2|R|T|B|0|mini tank,cycle
Dart Goblin|3|R|T|A|0|anti-air,support
Flying Machine|4|R|T|A|1|anti-air,support
Zappies|4|R|T|A|0|reset,anti-air
Battle Healer|4|R|T|G|0|mini tank,support
Elixir Golem|3|R|T|B|0|tank
Three Musketeers|9|R|T|A|0|anti-air,support
Royal Hogs|5|R|T|B|0|win condition,swarm
Heal Spirit|1|R|T|A|0|cycle
Goblin Demolisher|4|R|T|G|0|splash,support
Mega Minion|3|R|T|A|1|anti-air,support
Furnace|4|R|B|A|0|spawner,splash
Goblin Hut|5|R|B|A|0|spawner
Bomb Tower|4|R|B|G|0|defensive building,splash
Inferno Tower|5|R|B|A|0|defensive building
Elixir Collector|6|R|B|G|0|support
Tombstone|3|R|B|G|0|defensive building,spawner
Goblin Cage|4|R|B|G|0|defensive building
Fireball|4|R|S|A|0|big spell
Rocket|6|R|S|A|0|big spell
Earthquake|3|R|S|G|0|big spell
P.E.K.K.A|7|E|T|G|0|tank
Golem|8|E|T|B|0|win condition,tank
Prince|5|E|T|G|0|win condition
Dark Prince|4|E|T|G|0|splash,mini tank
Baby Dragon|4|E|T|A|1|splash,anti-air
Witch|5|E|T|A|0|splash,anti-air,spawner
Skeleton Army|3|E|T|G|0|swarm
Balloon|5|E|T|B|1|win condition
Giant Skeleton|6|E|T|G|0|tank,splash
Bowler|5|E|T|G|0|splash,mini tank
Executioner|5|E|T|A|0|splash,anti-air
Hunter|4|E|T|A|0|anti-air,support
Guards|3|E|T|G|0|swarm
Cannon Cart|5|E|T|G|0|support
Electro Dragon|5|E|T|A|1|anti-air,reset,splash
Goblin Giant|6|E|T|B|0|win condition,tank,anti-air
Electro Giant|7|E|T|B|0|win condition,tank,reset
Wall Breakers|2|E|T|B|0|win condition,cycle
X-Bow|6|E|B|G|0|win condition,defensive building
Goblin Barrel|3|E|S|G|0|win condition
Goblin Drill|4|E|B|G|0|win condition,spawner
Barbarian Barrel|2|E|S|G|0|small spell
Tornado|3|E|S|A|0|small spell
Poison|4|E|S|A|0|big spell
Freeze|4|E|S|A|0|support
Lightning|6|E|S|A|0|big spell,reset
Rage|2|E|S|A|0|support
Clone|3|E|S|A|0|support
Void|3|E|S|A|0|big spell
Goblin Curse|2|E|S|A|0|small spell
Miner|3|L|T|G|0|win condition,mini tank
Princess|3|L|T|A|0|splash,anti-air
Ice Wizard|3|L|T|A|0|splash,anti-air,support
Electro Wizard|4|L|T|A|0|reset,anti-air
Inferno Dragon|4|L|T|A|1|anti-air
Lumberjack|4|L|T|G|0|support
Bandit|3|L|T|G|0|mini tank
Night Witch|4|L|T|G|0|spawner,support
Royal Ghost|3|L|T|G|0|splash
Magic Archer|4|L|T|A|0|anti-air,support
Ram Rider|5|L|T|B|0|win condition
Sparky|6|L|T|G|0|splash
Lava Hound|7|L|T|B|1|win condition,tank
Mega Knight|7|L|T|G|0|tank,splash
Fisherman|3|L|T|G|0|support
Mother Witch|4|L|T|A|0|anti-air,support
Phoenix|4|L|T|A|1|anti-air,splash
Goblin Machine|5|L|T|G|0|mini tank
Graveyard|5|L|S|G|0|win condition
The Log|2|L|S|G|0|small spell
Archer Queen|5|H|T|A|0|anti-air,support
Golden Knight|4|H|T|G|0|mini tank
Skeleton King|4|H|T|G|0|mini tank,spawner
Mighty Miner|4|H|T|G|0|mini tank
Monk|5|H|T|G|0|mini tank
Little Prince|3|H|T|A|0|anti-air,support
Goblinstein|5|H|T|G|0|tank
Boss Bandit|6|H|T|G|0|mini tank
`;

export const CARDS: GameCardInfo[] = TABLE.trim()
  .split("\n")
  .map((line) => {
    const [name, elixir, rarity, type, targets, flies, roles] = line.split("|");
    return {
      name,
      elixir: Number(elixir),
      rarity: RARITY[rarity],
      type: TYPE[type],
      targets: TARGETS[targets],
      flies: flies === "1",
      roles: roles.split(",").map((r) => r.trim()),
    };
  });

const key = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/s$/, "");

const BY_KEY = new Map(CARDS.map((c) => [key(c.name), c]));
const ALIASES: Record<string, string> = {
  pekka: "P.E.K.K.A",
  minipekka: "Mini P.E.K.K.A",
  log: "The Log",
  mk: "Mega Knight",
  ewiz: "Electro Wizard",
  edrag: "Electro Dragon",
  egiant: "Electro Giant",
  hog: "Hog Rider",
  xbow: "X-Bow",
  barbbarrel: "Barbarian Barrel",
  skarmy: "Skeleton Army",
  gobbarrel: "Goblin Barrel",
  "3m": "Three Musketeers",
  threemusketeer: "Three Musketeers",
  rg: "Royal Giant",
  ebarb: "Elite Barbarians",
  elitebarb: "Elite Barbarians",
  aq: "Archer Queen",
  gk: "Golden Knight",
  sk: "Skeleton King",
  infernotower: "Inferno Tower",
  inferno: "Inferno Tower",
  lavahound: "Lava Hound",
  lava: "Lava Hound",
  icewiz: "Ice Wizard",
  babydrag: "Baby Dragon",
  musk: "Musketeer",
  valk: "Valkyrie",
};

/** A card by its name, ignoring case, punctuation and a plural s; common nicknames too. */
export function findCard(name: unknown): GameCardInfo | null {
  if (typeof name !== "string" || !name.trim()) return null;
  const k = key(name);
  return BY_KEY.get(k) ?? (ALIASES[k] ? (BY_KEY.get(key(ALIASES[k])) ?? null) : null);
}

export interface DeckStats {
  cards: string[];
  unknown: string[];
  count: number;
  avgElixir: number;
  cycle: number;
  winConditions: string[];
  spells: string[];
  buildings: string[];
  antiAir: string[];
  splash: string[];
  tanks: string[];
  style: string;
  warnings: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** What a deck of up to eight cards adds up to, with plain-language warnings. */
export function deckStats(names: unknown): DeckStats {
  const list = Array.isArray(names) ? names : [];
  const found = list.map(findCard);
  const cards = found.filter((c): c is GameCardInfo => !!c);
  const unknown = list.filter((_, i) => !found[i]).map((v) => String(v));
  const costs = cards.map((c) => c.elixir).sort((a, b) => a - b);
  const avg = costs.length ? round1(costs.reduce((a, b) => a + b, 0) / costs.length) : 0;
  const cycle = costs.slice(0, 4).reduce((a, b) => a + b, 0);
  const has = (role: string) => cards.filter((c) => c.roles.includes(role)).map((c) => c.name);
  const winConditions = has("win condition");
  const spells = cards.filter((c) => c.type === "Spell").map((c) => c.name);
  const buildings = cards.filter((c) => c.type === "Building").map((c) => c.name);
  const antiAir = cards.filter((c) => c.targets === "Air & ground" && c.type !== "Spell").map((c) => c.name);
  // Damage spells hit an area too, so they count as splash.
  const splash = cards.filter((c) => c.roles.includes("splash") || c.roles.includes("big spell") || c.roles.includes("small spell")).map((c) => c.name);
  const tanks = [...has("tank"), ...has("mini tank")];
  const style = avg === 0 ? "Empty" : avg <= 3.0 ? "Fast cycle" : avg <= 3.8 ? "Balanced" : avg <= 4.3 ? "Beatdown" : "Heavy beatdown";
  const warnings: string[] = [];
  if (cards.length && cards.length < 8) warnings.push(`Only ${cards.length} of 8 cards`);
  if (cards.length > 8) warnings.push(`${cards.length} cards: a deck holds 8`);
  if (cards.length && !winConditions.length) warnings.push("No win condition");
  if (cards.length >= 6 && antiAir.length < 2) warnings.push("Weak to air: fewer than 2 air defenders");
  if (cards.length >= 6 && !spells.length) warnings.push("No spell");
  if (cards.length >= 6 && !splash.length) warnings.push("No splash: swarms will hurt");
  if (avg > 4.5) warnings.push("Very heavy: expect to fall behind on elixir early");
  if (new Set(cards.map((c) => c.name)).size !== cards.length) warnings.push("Duplicate cards");
  const champions = cards.filter((c) => c.rarity === "Champion");
  if (champions.length > 1) warnings.push("Only one Champion per deck");
  if (unknown.length) warnings.push(`Unknown: ${unknown.join(", ")}`);
  return {
    cards: cards.map((c) => c.name),
    unknown,
    count: cards.length,
    avgElixir: avg,
    cycle,
    winConditions,
    spells,
    buildings,
    antiAir,
    splash,
    tanks,
    style,
    warnings,
  };
}
