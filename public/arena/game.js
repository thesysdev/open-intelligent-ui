// A small Clash Royale-style arena for the coach demo: 18 x 32 tiles, three
// towers a side, a river with two bridges, elixir, a cycling four-card hand,
// an opponent that plays an archetype deck, and the cards' real-ish stats
// from cards.js. Runs in a sandboxed iframe; the deck comes in the URL hash.
// Fan-made and simplified; not the game's engine or balance.
(function () {
  "use strict";

  // ---- Config -------------------------------------------------------------
  const W = 18, H = 32; // tiles
  const TILE = 20; // px at logical scale
  const TOP = 44, BOTTOM = 124; // HUD heights
  const CW = W * TILE, CH = TOP + H * TILE + BOTTOM;
  const RIVER = { y0: 15, y1: 17 };
  const BRIDGES = [3.5, 14.5]; // x centers, 2 tiles wide
  const REGEN = 1 / 2.8; // elixir per second
  const MATCH = 180, OVERTIME = 60;
  const AGGRO = 5.5;
  // The opponent plays like a person: it notices a new threat after REACTION
  // seconds and looks at its hand every THINK seconds.
  const REACTION = [0.8, 1.6], THINK = [0.8, 1.4];

  const params = Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
  const deckNames = (params.deck || "").split(",").map((s) => s.trim()).filter(Boolean);
  const oppName = params.opp && ARCHETYPE_DECKS[params.opp] ? params.opp : "Hog Cycle";
  const SPEED = Math.max(0.25, Math.min(16, Number(params.speed) || 1));
  const AUTO = params.auto === "1"; // the player side plays itself (for tests)

  const STATS = window.CARD_STATS;
  const COST = window.CARD_COST;
  const ART_ALIAS = { "Golemite": "Golem", "Lava Pup": "Lava Hound", "Goblin Brawler": "Goblin Cage" };
  const slug = (n) => (ART_ALIAS[n] || n).toLowerCase().replace(/\./g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function stat(name) {
    const s = STATS[name];
    if (!s) return null;
    const [type, hp, dmg, hitSpeed, range, speed, count, flags, splash, extra] = s;
    return { name, type, hp, dmg, hitSpeed, range, speed, count, flags: flags || "", splash: splash || 0, extra: extra || {}, cost: COST[name] || 0 };
  }

  // ---- Images ---------------------------------------------------------------
  const images = new Map();
  function img(name) {
    if (!images.has(name)) {
      const i = new Image();
      i.src = "../cards/" + slug(name) + ".png";
      images.set(name, i);
    }
    const i = images.get(name);
    return i.complete && i.naturalWidth ? i : null;
  }

  // ---- State ----------------------------------------------------------------
  let rnd = mulberry(Number(params.seed) || (Date.now() & 0xffff));
  function mulberry(a) {
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const G = {
    time: 0, over: false, result: null, overtime: false, sudden: false,
    units: [], fx: [], floats: [], projectiles: [],
    players: [
      { id: 0, elixir: 5, deck: [], hand: [], next: null, crowns: 0, selected: -1, ai: AUTO },
      { id: 1, elixir: 5, deck: [], hand: [], next: null, crowns: 0, selected: -1, ai: true },
    ],
    towers: [],
    aiTimer: [0, 0],
    pointer: null,
    message: "", messageUntil: 0,
  };

  function setupDeck(p, names) {
    const valid = names.filter((n) => STATS[n]);
    while (valid.length < 8) valid.push(["Knight", "Archers", "Fireball", "Skeletons", "Musketeer", "Giant", "Zap", "Minions"][valid.length]);
    p.deck = shuffle(valid.slice(0, 8));
    p.hand = p.deck.splice(0, 4);
    p.next = p.deck.shift();
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function cycle(p, i) {
    const card = p.hand[i];
    p.hand[i] = p.next;
    p.deck.push(card);
    p.next = p.deck.shift();
  }

  function makeTower(team, kind, x, y) {
    const t = TOWER_STATS[kind];
    return { id: nextId++, team, kind, building: true, tower: true, name: kind === "king" ? "King Tower" : "Princess Tower", x, y, hp: t.hp, maxHp: t.hp, dmg: t.dmg, hitSpeed: t.hitSpeed, range: t.range, r: kind === "king" ? 1.4 : 1.1, cd: 0, active: kind !== "king", flags: "A", target: null, dead: false };
  }
  let nextId = 1;
  function init() {
    G.towers = [
      makeTower(1, "princess", 3.5, 6.5), makeTower(1, "princess", 14.5, 6.5), makeTower(1, "king", 9, 2.5),
      makeTower(0, "princess", 3.5, 25.5), makeTower(0, "princess", 14.5, 25.5), makeTower(0, "king", 9, 29.5),
    ];
    setupDeck(G.players[0], deckNames.length ? deckNames : ARCHETYPE_DECKS["Hog Cycle"]);
    setupDeck(G.players[1], ARCHETYPE_DECKS[oppName]);
  }

  // ---- Units ------------------------------------------------------------------
  function spawn(team, name, x, y, opts) {
    const s = stat(name);
    if (!s || s.type === "S") return [];
    const out = [];
    const n = (opts && opts.count) || s.count || 1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const spread = n > 1 ? 0.45 + n * 0.05 : 0;
      const u = {
        id: nextId++, team, name: s.name, x: x + Math.cos(a) * spread, y: y + Math.sin(a) * spread,
        hp: s.hp, maxHp: s.hp, dmg: s.dmg, hitSpeed: s.hitSpeed, range: s.range, speed: s.speed,
        flags: s.flags, splash: s.splash, extra: s.extra, building: s.type === "B",
        flies: s.flags.includes("F"), hitsAir: s.flags.includes("A"), onlyBuildings: s.flags.includes("B"), kamikaze: s.flags.includes("K"),
        r: s.type === "B" ? 0.9 : Math.min(0.75, 0.28 + Math.sqrt(s.hp) / 90),
        cd: s.hitSpeed * 0.5, target: null, dead: false, born: G.time, deploy: (opts && opts.deploy) || 0,
        life: s.extra.life ? s.extra.life : Infinity, spawnCd: s.extra.spawn ? (s.extra.spawn.first != null ? s.extra.spawn.first : s.extra.spawn.every || 0) : 0, elixCd: s.extra.elixirEvery || 0,
        stun: 0, freeze: 0, slow: 0, rage: 0, ramp: 0, charge: 0, chargeDist: 0, dot: null, clone: !!(opts && opts.clone),
        retarget: 0, face: team === 0 ? -1 : 1, bump: 0,
      };
      if (u.clone) u.hp = u.maxHp = 1;
      u.x = clamp(u.x, 0.5, W - 0.5);
      u.y = clamp(u.y, 0.5, H - 0.5);
      G.units.push(u);
      out.push(u);
    }
    return out;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function enemiesOf(team) {
    return G.units.filter((u) => u.team !== team && !u.dead).concat(G.towers.filter((t) => t.team !== team && !t.dead));
  }
  function canHit(u, t) {
    if (t.flies && !u.hitsAir) return false;
    if (u.onlyBuildings && !t.building) return false;
    return true;
  }
  function pickTarget(u) {
    const enemies = enemiesOf(u.team).filter((t) => canHit(u, t));
    let best = null, bd = Infinity;
    // Troops in aggro range first, then the nearest building. Building-targeters only see buildings.
    for (const t of enemies) {
      if (t.building) continue;
      const d = dist(u, t) - t.r;
      if (d < AGGRO && d < bd) { best = t; bd = d; }
    }
    if (!best) {
      for (const t of enemies) {
        if (!t.building) continue;
        const d = dist(u, t) - t.r;
        if (d < bd) { best = t; bd = d; }
      }
    }
    return best;
  }
  function towerTarget(t) {
    let best = null, bd = Infinity;
    for (const u of G.units) {
      if (u.team === t.team || u.dead) continue;
      const d = dist(t, u) - u.r;
      if (d <= t.range && d < bd) { best = u; bd = d; }
    }
    return best;
  }

  function needsCrossing(u, target) {
    const side = (y) => (y < RIVER.y0 ? 1 : y >= RIVER.y1 ? 0 : -1);
    return !u.flies && side(u.y) !== -1 && side(target.y) !== -1 && side(u.y) !== side(target.y);
  }
  function inRiver(x, y) {
    if (y < RIVER.y0 || y >= RIVER.y1) return false;
    return !BRIDGES.some((bx) => Math.abs(x - bx) <= 1);
  }

  function moveToward(u, tx, ty, dt) {
    let sp = u.speed * (u.rage > 0 ? 1.35 : 1) * (u.slow > 0 ? 0.65 : 1);
    if (u.extra.charge && u.chargeDist >= u.extra.charge) sp *= 2;
    const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
    if (d < 1e-3) return;
    const step = Math.min(d, sp * dt);
    let nx = u.x + (dx / d) * step, ny = u.y + (dy / d) * step;
    if (!u.flies && inRiver(nx, ny)) {
      // Slide along the bank toward the nearest bridge.
      const bx = BRIDGES.reduce((a, b) => (Math.abs(b - u.x) < Math.abs(a - u.x) ? b : a));
      nx = u.x + Math.sign(bx - u.x) * step;
      ny = u.y;
      if (inRiver(nx, ny)) nx = u.x;
    }
    u.chargeDist += step;
    u.x = clamp(nx, 0.4, W - 0.4);
    u.y = clamp(ny, 0.4, H - 0.4);
    if (Math.abs(dy) > 0.01) u.face = dy < 0 ? -1 : 1;
  }

  function applyDamage(target, amount, from, opts) {
    if (target.dead) return;
    if (target.tower && target.kind === "king") target.active = true;
    target.hp -= amount;
    if (amount >= 1) G.floats.push({ x: target.x, y: target.y - target.r, text: Math.round(amount), t: 0, team: from ? from.team : 1 });
    if (opts && opts.stun) target.stun = Math.max(target.stun || 0, opts.stun);
    if (opts && opts.freeze) target.freeze = Math.max(target.freeze || 0, opts.freeze);
    if (opts && opts.slow) target.slow = Math.max(target.slow || 0, opts.slow);
    if (from && from.extra && from.extra.ramp && !opts) from.ramp = Math.min(from.extra.ramp, (from.ramp || 0) + 1);
    if (target.hp <= 0) kill(target, from);
  }
  function heal(team, x, y, r, amount) {
    for (const u of G.units) if (u.team === team && !u.dead && !u.building && dist(u, { x, y }) <= r) u.hp = Math.min(u.maxHp, u.hp + amount);
  }
  function kill(u, by) {
    if (u.dead) return;
    u.dead = true;
    if (u.tower) {
      const other = G.players[1 - u.team];
      if (u.kind === "king") { other.crowns = 3; endMatch(1 - u.team); }
      else {
        other.crowns++;
        // The king wakes up when a princess tower falls.
        G.towers.find((t) => t.team === u.team && t.kind === "king").active = true;
        flash(`${u.team === 0 ? "Your" : "Their"} tower is down!`);
        if (G.sudden) endMatch(1 - u.team);
      }
      G.fx.push({ kind: "boom", x: u.x, y: u.y, r: 2.5, t: 0, dur: 0.8 });
      return;
    }
    const d = u.extra.death;
    if (d) {
      if (d.dmg) areaDamage(u.team, u.x, u.y, d.r || 1.5, d.dmg, u, { slow: d.slow });
      if (d.card) spawn(u.team, d.card, u.x, u.y, { count: d.count });
      if (d.rage) G.fx.push({ kind: "rage", x: u.x, y: u.y, r: d.r || 3, t: 0, dur: d.rage, team: u.team });
    }
    G.fx.push({ kind: "pop", x: u.x, y: u.y, r: u.r, t: 0, dur: 0.35, name: u.name });
  }
  function areaDamage(team, x, y, r, dmg, from, opts) {
    const o = opts || {};
    const victims = enemiesOf(team).filter((t) => dist(t, { x, y }) <= r + t.r * 0.5 && !(o.ground && t.flies));
    let list = victims;
    if (o.top) list = victims.filter((v) => !v.tower).sort((a, b) => b.hp - a.hp).slice(0, o.top).concat(victims.filter((v) => v.tower).slice(0, 1));
    for (const t of list) {
      let amount = dmg;
      if (t.tower) amount = dmg * (o.towerMul != null ? o.towerMul : 0.35); // spells and splash hit towers for less
      else if (t.building && o.buildingDmg) amount = o.buildingDmg;
      if (o.shared) amount = victims.length >= 4 ? dmg * 0.35 : victims.length >= 2 ? dmg * 0.6 : dmg;
      applyDamage(t, amount, from, { stun: o.stun, freeze: o.freeze, slow: o.slow });
      if (o.push && !t.building && !t.dead) {
        const dx = t.x - x, dy = t.y - y, d = Math.hypot(dx, dy) || 1;
        t.x = clamp(t.x + (dx / d) * 0.8, 0.4, W - 0.4);
        t.y = clamp(t.y + (dy / d) * 0.8, 0.4, H - 0.4);
      }
    }
  }

  // ---- Playing cards ------------------------------------------------------------
  function playable(team, name, x, y) {
    const s = stat(name);
    if (!s) return false;
    if (s.type === "S" || s.extra.anywhere) return true;
    // Own half, plus the enemy side of a lane whose princess tower is down.
    const own = team === 0 ? y >= RIVER.y1 : y < RIVER.y0;
    if (own) return true;
    const lane = x < W / 2 ? 0 : 1;
    const tower = G.towers.find((t) => t.team !== team && t.kind === "princess" && (t.x < W / 2 ? 0 : 1) === lane);
    if (tower && tower.dead) {
      const inLane = lane === 0 ? x < W / 2 : x >= W / 2;
      return inLane && (team === 0 ? y >= 9 && y < RIVER.y1 : y >= RIVER.y0 && y < H - 9);
    }
    return false;
  }
  function playCard(team, handIndex, x, y) {
    const p = G.players[team];
    const name = p.hand[handIndex];
    const s = stat(name);
    if (!s || p.elixir < s.cost || !playable(team, name, x, y)) return false;
    p.elixir -= s.cost;
    cycle(p, handIndex);
    if (s.type === "S") castSpell(team, s, x, y);
    else {
      const units = spawn(team, name, x, y, { deploy: s.extra.deploy != null ? s.extra.deploy : 1 });
      if (s.extra.spawnDmg) areaDamage(team, x, y, s.extra.spawnR || 2, s.extra.spawnDmg, units[0], { stun: 0.5 });
      G.fx.push({ kind: "deploy", x, y, r: 1.2, t: 0, dur: 0.5, team });
    }
    return true;
  }
  function castSpell(team, s, x, y) {
    const e = s.extra;
    const ground = s.flags.includes("G");
    G.fx.push({ kind: "target", x, y, r: s.range, t: 0, dur: s.hitSpeed + 0.3, team });
    if (e.roll) {
      // A log or barrel rolls from the caster's side across the point.
      const dir = team === 0 ? -1 : 1;
      G.fx.push({ kind: "roll", x, y: y - dir * 1, r: s.range, t: 0, dur: e.roll / 5, team, dmg: s.dmg, len: e.roll, dir, hit: new Set(), spawn: e.spawn, push: e.push });
      return;
    }
    const start = { x: team === 0 ? 9 : 9, y: team === 0 ? 29 : 3 };
    G.projectiles.push({ kind: "spell", x: start.x, y: start.y, tx: x, ty: y, t: 0, dur: s.hitSpeed, team, name: s.name, onHit: () => {
      if (e.spawn && !e.roll) spawn(team, e.spawn.card, x, y, { count: e.spawn.single ? 1 : undefined });
      if (e.grave) G.fx.push({ kind: "grave", x, y, r: s.range, t: 0, dur: e.grave.duration, team, every: e.grave.every, acc: -(e.grave.delay || 0) });
      if (e.dot) G.fx.push({ kind: "dot", x, y, r: s.range, t: 0, dur: e.dot.duration, team, dps: e.dot.dps, acc: 0 });
      if (e.rage) G.fx.push({ kind: "rage", x, y, r: s.range, t: 0, dur: e.rage, team });
      if (e.pull) {
        for (const u of enemiesOf(team)) if (!u.building && dist(u, { x, y }) <= s.range) { u.x += (x - u.x) * 0.8; u.y += (y - u.y) * 0.8; }
      }
      if (e.clone) {
        for (const u of G.units.filter((u) => u.team === team && !u.dead && !u.building && dist(u, { x, y }) <= s.range)) spawn(team, u.name, u.x + 0.4, u.y + 0.4, { count: 1, clone: true });
      }
      if (s.dmg) areaDamage(team, x, y, s.range, s.dmg, null, { ground, stun: e.stun, freeze: e.freeze, slow: e.slow, push: e.push, top: e.top, shared: e.shared, buildingDmg: e.buildingDmg, towerMul: s.name === "Rocket" || s.name === "Lightning" ? 0.5 : 0.35 });
      G.fx.push({ kind: e.freeze ? "freeze" : "blast", x, y, r: s.range, t: 0, dur: e.freeze ? e.freeze : 0.45, team, name: s.name });
    } });
  }

  // ---- Opponent AI ----------------------------------------------------------------
  const ROLES = {}; // card -> roles, from the coach table in the hash (optional); fallback by stats
  function roleOf(name) {
    const s = stat(name);
    if (!s) return [];
    const roles = [];
    if (s.onlyBuildings !== undefined) {}
    if (s.flags.includes("B") && s.type === "T") roles.push("win");
    if (s.hp >= 2500) roles.push("tank");
    if (s.splash || s.type === "S") roles.push("splash");
    if (s.flags.includes("A") && s.type !== "S") roles.push("air");
    if (s.count >= 3) roles.push("swarm");
    if (s.type === "B") roles.push("building");
    if (s.type === "S" && s.cost <= 3) roles.push("small");
    if (s.type === "S" && s.cost >= 4) roles.push("big");
    if (s.cost <= 2) roles.push("cycle");
    return roles;
  }
  function threatsNear(team) {
    // Enemy troops in my half that it has had time to notice, with how dangerous they are.
    const mine = team === 1 ? (u) => u.y < RIVER.y1 + 2 : (u) => u.y >= RIVER.y0 - 2;
    return G.units.filter((u) => {
      if (u.team === team || u.dead || !mine(u)) { if (u.seen) u.seen[team] = null; return false; }
      u.seen = u.seen || [null, null];
      if (u.seen[team] == null) u.seen[team] = G.time + REACTION[0] + rnd() * (REACTION[1] - REACTION[0]);
      return G.time >= u.seen[team];
    }).map((u) => ({ u, value: (u.hp / 400) + (u.onlyBuildings ? 2 : 0) + (u.flies ? 0.5 : 0) }));
  }
  function aiThink(team, dt) {
    const p = G.players[team];
    G.aiTimer[team] -= dt;
    if (G.aiTimer[team] > 0) return;
    G.aiTimer[team] = THINK[0] + rnd() * (THINK[1] - THINK[0]);
    const home = team === 1 ? { y: 10 } : { y: 22 };
    const inHand = (i) => stat(p.hand[i]);

    // 1. Defend the biggest threat in my half.
    const threats = threatsNear(team).sort((a, b) => b.value - a.value);
    if (threats.length) {
      const th = threats[0].u;
      const cluster = threats.filter((t) => dist(t.u, th) < 3).length;
      // A spell for a cluster or a glass cannon.
      for (let i = 0; i < 4; i++) {
        const s = inHand(i);
        if (!s || s.type !== "S" || s.cost > p.elixir) continue;
        const kills = threats.filter((t) => dist(t.u, th) < s.range && t.u.hp <= s.dmg * 0.95).length;
        if ((cluster >= 3 && s.dmg >= 150) || kills >= 2 || (kills >= 1 && s.cost <= 3 && th.hp <= s.dmg)) {
          if (playCard(team, i, th.x, th.y)) return;
        }
      }
      // A troop or building that can hit it, placed between it and the tower.
      let best = -1, bs = -1;
      for (let i = 0; i < 4; i++) {
        const s = inHand(i);
        if (!s || s.type === "S" || s.cost > p.elixir) continue;
        let score = 0;
        if (th.flies) score += s.flags.includes("A") ? 3 : -5;
        if (th.onlyBuildings && s.type === "B") score += 3;
        if (th.hp > 2000) score += s.dmg * (1 / Math.max(0.3, s.hitSpeed)) / 150;
        if (cluster >= 3 && s.splash) score += 2;
        if (th.hp < 400 && s.count >= 3) score += 1;
        score += Math.min(2, s.hp / 1000) - s.cost * 0.25;
        if (s.flags.includes("B")) score -= 4;
        if (score > bs) { bs = score; best = i; }
      }
      if (best >= 0 && bs > 0) {
        const s = inHand(best);
        const towerY = team === 1 ? 6.5 : 25.5;
        let x = clamp(th.x + (th.x < W / 2 ? 1 : -1) * 0.5, 1, W - 1), y = s.type === "B" ? (team === 1 ? 9.5 : 22.5) : th.y + (towerY - th.y) * 0.45;
        if (s.type === "B") x = W / 2;
        if (!playable(team, s.name, x, y)) y = team === 1 ? RIVER.y0 - 1.5 : RIVER.y1 + 1.5;
        if (playCard(team, best, x, y)) return;
      }
    }

    // 2. Attack: lead with the win condition when elixir allows, support behind.
    const lane = rnd() < 0.5 ? 0 : 1;
    const laneX = lane === 0 ? 3.5 : 14.5;
    const pushing = G.units.filter((u) => u.team === team && !u.dead && !u.building && (team === 1 ? u.y > 8 : u.y < 24));
    for (let i = 0; i < 4; i++) {
      const s = inHand(i);
      if (!s || s.cost > p.elixir) continue;
      const roles = roleOf(s.name);
      const ahead = p.elixir - s.cost;
      if (roles.includes("win") && roles.includes("tank") && ahead >= 0 && p.elixir >= 8) {
        if (playCard(team, i, laneX, team === 1 ? 2.5 : 29.5)) return; // tank at the back
      }
      if (roles.includes("win") && !roles.includes("tank") && (ahead >= 2 || G.time > 120)) {
        if (playCard(team, i, laneX, team === 1 ? RIVER.y0 - 1 : RIVER.y1 + 1)) return; // bridge
      }
      if (s.type === "B" && !s.extra.anywhere && !s.extra.spawn && roles.includes("building") && !G.units.some((u) => u.team === team && u.building && !u.dead) && p.elixir >= s.cost + 3) {
        if (s.range > 8) { if (playCard(team, i, laneX, team === 1 ? RIVER.y0 - 3 : RIVER.y1 + 3)) return; } // siege at the river
      }
      if (s.type === "S" && s.extra.anywhere) {
        const tower = G.towers.find((t) => t.team !== team && t.kind === "princess" && !t.dead) || G.towers.find((t) => t.team !== team && !t.dead);
        if (tower && ahead >= 1 && rnd() < 0.5) { if (playCard(team, i, tower.x, tower.y + (team === 1 ? 1.5 : -1.5))) return; }
      }
    }
    // Support an existing push with the best support card.
    if (pushing.length) {
      const lead = pushing.reduce((a, b) => (team === 1 ? (b.y > a.y ? b : a) : (b.y < a.y ? b : a)));
      for (let i = 0; i < 4; i++) {
        const s = inHand(i);
        if (!s || s.type !== "T" || s.cost > p.elixir || roleOf(s.name).includes("win")) continue;
        if (s.flags.includes("A") || s.splash || s.range >= 4) {
          const y = lead.y + (team === 1 ? -2 : 2);
          if (playable(team, s.name, lead.x, y) && playCard(team, i, lead.x, y)) return;
        }
      }
    }
    // 3. Never sit at full elixir: cycle the cheapest card at the back.
    if (p.elixir >= 9.6) {
      let cheapest = -1;
      for (let i = 0; i < 4; i++) { const s = inHand(i); if (s && s.type === "T" && (cheapest < 0 || s.cost < inHand(cheapest).cost)) cheapest = i; }
      if (cheapest >= 0) playCard(team, cheapest, laneX, team === 1 ? 3 : 29);
    }
  }

  // ---- Simulation step --------------------------------------------------------------
  function step(dt) {
    if (G.over) return;
    G.time += dt;
    const left = timeLeft();
    if (!G.overtime && G.time >= MATCH) {
      if (G.players[0].crowns !== G.players[1].crowns) return endMatch(G.players[0].crowns > G.players[1].crowns ? 0 : 1);
      G.overtime = true; G.sudden = true; flash("Overtime! First tower wins");
    }
    if (G.overtime && G.time >= MATCH + OVERTIME) return endMatch(-1);
    const mult = G.overtime ? 3 : G.time >= 120 ? 2 : 1;
    for (const p of G.players) p.elixir = Math.min(10, p.elixir + REGEN * mult * dt);
    for (const u of G.units) if (u.extra.elixirEvery && !u.dead) { u.elixCd -= dt; if (u.elixCd <= 0) { u.elixCd = u.extra.elixirEvery; G.players[u.team].elixir = Math.min(10, G.players[u.team].elixir + 1); } }
    if (G.time < 120 && G.time + dt >= 120) flash("Double elixir!");

    for (const p of G.players) if (p.ai) aiThink(p.id, dt);

    // Units
    for (const u of G.units) {
      if (u.dead) continue;
      if (u.deploy > 0) { u.deploy -= dt; continue; }
      if (u.life !== Infinity) {
        // Buildings lose their hit points evenly over their lifetime.
        u.life -= dt;
        u.hp -= (u.maxHp / u.extra.life) * dt;
        if (u.hp <= 0 || u.life <= 0) { u.hp = 0; kill(u, null); continue; }
      }
      if (u.jumpCd > 0) u.jumpCd -= dt;
      if (u.stun > 0) { u.stun -= dt; u.chargeDist = 0; }
      if (u.freeze > 0) { u.freeze -= dt; continue; }
      if (u.slow > 0) u.slow -= dt;
      if (u.rage > 0) u.rage -= dt;
      if (u.dot) { applyDamage(u, u.dot.dps * dt, null); u.dot.left -= dt; if (u.dot.left <= 0) u.dot = null; if (u.dead) continue; }
      if (u.extra.spawn && u.extra.spawn.every) {
        u.spawnCd -= dt;
        if (u.spawnCd <= 0) { u.spawnCd = u.extra.spawn.every; spawn(u.team, u.extra.spawn.card, u.x, u.y + (u.team === 0 ? -1 : 1), { count: u.extra.spawn.n || u.extra.spawn.count || 1 }); }
      }
      if (u.extra.heal && u.name === "Battle Healer") { u.healCd = (u.healCd || 0) - dt; if (u.healCd <= 0) { u.healCd = 1; heal(u.team, u.x, u.y, 3, u.extra.heal); } }
      if (u.building && !u.dmg) continue; // passive building

      u.retarget -= dt;
      if (!u.target || u.target.dead || u.retarget <= 0 || !canHit(u, u.target)) { u.target = pickTarget(u); u.retarget = 0.4; u.ramp = u.target && u.target === u.target ? u.ramp : 0; }
      const t = u.target;
      if (!t) continue;
      const gap = dist(u, t) - t.r - (u.building ? 0 : u.r * 0.3);
      const reach = Math.max(u.range, 0.6);
      if (u.stun > 0) continue;
      if (gap <= reach) {
        if (u.building && u.extra.minRange && gap < u.extra.minRange) { u.target = null; continue; }
        u.cd -= dt * (u.rage > 0 ? 1.35 : 1);
        if (u.cd <= 0) {
          u.cd = u.hitSpeed;
          attack(u, t);
          u.chargeDist = 0;
        }
      } else if (!u.building) {
        const jump = u.extra.jump;
        if (jump && !t.tower && gap >= jump.min && gap <= jump.max && !(u.jumpCd > 0)) {
          // Mega Knight leaps onto a troop or building 3.5 to 5 tiles away.
          u.x = t.x + (u.x - t.x) * (t.r / Math.max(dist(u, t), 0.01)); u.y = t.y + (u.y - t.y) * (t.r / Math.max(dist(u, t), 0.01));
          areaDamage(u.team, u.x, u.y, 2.2, jump.dmg, u, { towerMul: 1, ground: true });
          G.fx.push({ kind: "boom", x: u.x, y: u.y, r: 2.2, t: 0, dur: 0.4 });
          u.cd = u.hitSpeed; u.jumpCd = 2;
          continue;
        }
        let tx = t.x, ty = t.y;
        if (needsCrossing(u, t)) {
          const bx = BRIDGES.reduce((a, b) => (Math.abs(b - u.x) < Math.abs(a - u.x) ? b : a));
          const onBridgeCol = Math.abs(u.x - bx) <= 0.6;
          if (!onBridgeCol) { tx = bx; ty = u.team === 0 ? Math.max(u.y, RIVER.y1 + 0.3) : Math.min(u.y, RIVER.y0 - 0.3); if (Math.abs(u.y - ty) < 0.2) ty = u.y; }
          else { tx = bx; ty = u.team === 0 ? RIVER.y0 - 1 : RIVER.y1 + 1; }
        }
        moveToward(u, tx, ty, dt);
        // A troop needs about half its hit speed to swing after it stops.
        u.cd = Math.max(u.hitSpeed * 0.5, u.cd - dt);
      }
    }
    // Keep same-team ground units from stacking.
    const live = G.units.filter((u) => !u.dead && !u.building);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      if (a.flies !== b.flies) continue;
      const d = dist(a, b), min = (a.r + b.r) * 0.9;
      if (d < min && d > 1e-4) { const push = (min - d) / 2, dx = (b.x - a.x) / d, dy = (b.y - a.y) / d; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; }
    }
    // Towers
    for (const t of G.towers) {
      if (t.dead || !t.active) continue;
      t.cd -= dt;
      if (!t.target || t.target.dead || dist(t, t.target) - t.target.r > t.range) t.target = towerTarget(t);
      if (t.target && t.cd <= 0) { t.cd = t.hitSpeed; G.projectiles.push({ kind: "shot", x: t.x, y: t.y - 0.6, target: t.target, t: 0, dur: Math.max(0.15, dist(t, t.target) / 9), team: t.team, dmg: t.dmg, from: t }); }
    }
    // Projectiles
    for (const pr of G.projectiles) {
      pr.t += dt;
      if (pr.t >= pr.dur) {
        pr.done = true;
        if (pr.kind === "spell") pr.onHit();
        else if (pr.target && !pr.target.dead) {
          if (pr.splash) areaDamage(pr.team, pr.target.x, pr.target.y, pr.splash, pr.dmg, pr.from, { stun: pr.stun, slow: pr.slow, towerMul: 1 });
          else applyDamage(pr.target, pr.dmg, pr.from, pr.stun || pr.slow ? { stun: pr.stun, slow: pr.slow } : undefined);
        }
      }
    }
    G.projectiles = G.projectiles.filter((p) => !p.done);
    // Effects with behaviour
    for (const f of G.fx) {
      f.t += dt;
      if (f.kind === "roll") {
        const prog = Math.min(1, f.t / f.dur);
        const y = f.y + f.dir * f.len * prog;
        for (const u of enemiesOf(f.team)) {
          if (u.flies || f.hit.has(u.id)) continue;
          if (Math.abs(u.x - f.x) <= f.r + u.r * 0.5 && Math.abs(u.y - y) <= 0.8) { f.hit.add(u.id); applyDamage(u, u.tower ? f.dmg * 0.35 : f.dmg, null); if (f.push && !u.building) u.y = clamp(u.y + f.dir * 0.8, 0.4, H - 0.4); }
        }
        if (prog >= 1 && f.spawn && !f.spawned) { f.spawned = true; spawn(f.team, f.spawn.card, f.x, y, { count: 1 }); }
      }
      if (f.kind === "grave") { f.acc += dt; while (f.acc >= f.every) { f.acc -= f.every; const a = rnd() * Math.PI * 2, rr = rnd() * f.r; spawn(f.team, "Skeletons", f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr, { count: 1 }); } }
      if (f.kind === "dot") { for (const u of enemiesOf(f.team)) if (dist(u, f) <= f.r + u.r * 0.5) applyDamage(u, (u.tower ? 0.35 : 1) * f.dps * dt, null); }
      if (f.kind === "rage") { for (const u of G.units) if (u.team === f.team && !u.dead && dist(u, f) <= f.r) u.rage = Math.max(u.rage, 0.3); }
    }
    G.fx = G.fx.filter((f) => f.t < f.dur);
    for (const fl of G.floats) fl.t += dt;
    G.floats = G.floats.filter((f) => f.t < 0.9);
    G.units = G.units.filter((u) => !u.dead);
  }

  function attack(u, t) {
    const opts = { stun: u.extra.stun, freeze: u.extra.freeze, slow: u.extra.slow };
    let dmg = u.dmg * (u.ramp ? 1 + u.ramp * 0.8 : 1);
    if (u.extra.charge && u.chargeDist >= u.extra.charge) dmg *= 2;
    if (u.extra.heal && u.kamikaze) heal(u.team, u.x, u.y, 2.5, u.extra.heal);
    if (u.range >= 2.5 && !u.building) {
      G.projectiles.push({ kind: "shot", x: u.x, y: u.y, target: t, t: 0, dur: Math.max(0.1, dist(u, t) / 9), team: u.team, dmg, from: u, splash: u.splash, stun: opts.stun, slow: opts.slow });
    } else if (u.splash) {
      areaDamage(u.team, t.x, t.y, u.splash, dmg, u, { ...opts, towerMul: 1, ground: !u.hitsAir });
    } else {
      applyDamage(t, dmg, u, opts.stun || opts.freeze || opts.slow ? opts : undefined);
    }
    if (u.extra.reflect && !t.building && dist(u, t) < 1.5) applyDamage(t, u.extra.reflect, u);
    if (u.kamikaze) { u.hp = 0; u.dead = true; G.fx.push({ kind: "blast", x: u.x, y: u.y, r: u.splash || 1, t: 0, dur: 0.4, team: u.team, name: u.name }); }
    G.fx.push({ kind: "hit", x: t.x, y: t.y, r: 0.3, t: 0, dur: 0.15 });
  }

  function timeLeft() { return G.overtime ? MATCH + OVERTIME - G.time : MATCH - G.time; }
  function flash(msg) { G.message = msg; G.messageUntil = G.time + 2.2; }
  function endMatch(winner) {
    if (G.over) return;
    G.over = true;
    G.result = winner;
    try { parent.postMessage({ type: "coach-arena-result", winner, crowns: [G.players[0].crowns, G.players[1].crowns], time: Math.round(G.time), opponent: oppName }, "*"); } catch (e) {}
  }

  // ---- Rendering ------------------------------------------------------------------
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  let scale = 1;
  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    scale = Math.min(box.width / CW, box.height / CH);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(CW * scale * dpr);
    canvas.height = Math.round(CH * scale * dpr);
    canvas.style.width = Math.round(CW * scale) + "px";
    canvas.style.height = Math.round(CH * scale) + "px";
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }
  const tx = (x) => x * TILE, ty = (y) => TOP + y * TILE;

  function drawArena() {
    ctx.fillStyle = "#101418";
    ctx.fillRect(0, 0, CW, CH);
    // Grass
    const g = ctx.createLinearGradient(0, TOP, 0, TOP + H * TILE);
    g.addColorStop(0, "#5aa84f"); g.addColorStop(0.5, "#67b85a"); g.addColorStop(1, "#5aa84f");
    ctx.fillStyle = g;
    ctx.fillRect(0, TOP, CW, H * TILE);
    ctx.fillStyle = "rgba(0,0,0,0.045)";
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + y) % 2) ctx.fillRect(tx(x), ty(y), TILE, TILE);
    // Deploy zones the player can use right now (faint)
    if (G.pointer && G.pointer.card != null || G.players[0].selected >= 0) {
      const card = G.players[0].hand[G.pointer && G.pointer.card != null ? G.pointer.card : G.players[0].selected];
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (playable(0, card, x + 0.5, y + 0.5)) ctx.fillRect(tx(x), ty(y), TILE, TILE);
    }
    // River and bridges
    ctx.fillStyle = "#3f8fd9";
    ctx.fillRect(0, ty(RIVER.y0), CW, (RIVER.y1 - RIVER.y0) * TILE);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 9; i++) ctx.fillRect(i * 40 + ((G.time * 10) % 40), ty(RIVER.y0) + 14, 18, 3);
    for (const bx of BRIDGES) {
      ctx.fillStyle = "#b07a3a";
      ctx.fillRect(tx(bx - 1), ty(RIVER.y0) - 3, TILE * 2, (RIVER.y1 - RIVER.y0) * TILE + 6);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let i = 0; i < 5; i++) ctx.fillRect(tx(bx - 1), ty(RIVER.y0) - 3 + i * 9.5, TILE * 2, 1.5);
    }
    // Tower pads
    for (const t of G.towers) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath(); ctx.ellipse(tx(t.x), ty(t.y) + 6, t.r * TILE + 6, t.r * TILE * 0.5 + 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawTower(t) {
    const x = tx(t.x), y = ty(t.y), r = t.r * TILE;
    if (t.dead) {
      ctx.fillStyle = "#6b6b66"; roundRect(x - r * 0.9, y - r * 0.4, r * 1.8, r * 0.9, 4); ctx.fill();
      ctx.fillStyle = "#4e4e4a"; roundRect(x - r * 0.6, y - r * 0.7, r * 0.7, r * 0.5, 3); ctx.fill();
      ctx.fillStyle = "#3a3a37"; roundRect(x + r * 0.1, y - r * 0.2, r * 0.6, r * 0.4, 3); ctx.fill();
      return;
    }
    const col = t.team === 0 ? ["#3b7bd8", "#2a5aa8", "#1f447f"] : ["#d8453b", "#a8302a", "#7d221e"];
    // Body with a darker right face
    ctx.fillStyle = col[1]; roundRect(x - r, y - r * 0.5, r * 2, r * 1.45, 5); ctx.fill();
    ctx.fillStyle = col[2]; ctx.fillRect(x + r * 0.55, y - r * 0.4, r * 0.45, r * 1.3);
    // Roof and battlements
    ctx.fillStyle = col[0]; roundRect(x - r * 1.05, y - r * 1.15, r * 2.1, r * 0.8, 4); ctx.fill();
    ctx.fillStyle = "#e8d9b8"; ctx.fillRect(x - r * 1.1, y - r * 1.3, r * 2.2, r * 0.22);
    for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * r * 0.72 - r * 0.18, y - r * 1.55, r * 0.36, r * 0.3);
    // Window
    ctx.fillStyle = "#1b2128"; roundRect(x - r * 0.18, y - r * 0.05, r * 0.36, r * 0.5, 3); ctx.fill();
    if (t.kind === "king") { ctx.fillStyle = "#f2c94c"; ctx.beginPath(); ctx.moveTo(x - 8, y - r * 1.55); ctx.lineTo(x - 5, y - r * 2.0); ctx.lineTo(x, y - r * 1.65); ctx.lineTo(x + 5, y - r * 2.0); ctx.lineTo(x + 8, y - r * 1.55); ctx.fill(); }
    if (!t.active) { ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "9px sans-serif"; ctx.textAlign = "center"; ctx.fillText("zzz", x + r, y - r * 1.8); }
    bar(x, y + r * 1.0 + 4, r * 2, t.hp / t.maxHp, t.team);
    ctx.fillStyle = "#fff"; ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center"; ctx.fillText(Math.round(Math.max(0, t.hp)), x, y + r + 14);
  }
  function bar(x, y, w, f, team) {
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - w / 2, y, w, 4);
    ctx.fillStyle = team === 0 ? "#4da3ff" : "#ff5a4d"; ctx.fillRect(x - w / 2, y, w * Math.max(0, f), 4);
  }
  function drawUnit(u) {
    const x = tx(u.x), y = ty(u.y) - (u.flies ? 10 : 0), r = u.r * TILE;
    if (u.deploy > 0) ctx.globalAlpha = 0.55;
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(tx(u.x), ty(u.y) + r * 0.6, r * 0.9, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    const ring = u.team === 0 ? "#2f7fff" : "#ff3b30";
    if (u.building) {
      ctx.fillStyle = ring; roundRect(x - r, y - r, r * 2, r * 2, 5); ctx.fill();
      const im = img(u.name);
      ctx.save(); roundRect(x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 4, 4); ctx.clip();
      if (im) ctx.drawImage(im, x - r, y - r * 1.2, r * 2, r * 2.4); else { ctx.fillStyle = "#777"; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      ctx.restore();
    } else {
      ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.fill();
      const im = img(u.name);
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
      if (im) ctx.drawImage(im, x - r * 1.05, y - r * 1.25, r * 2.1, r * 2.55); else { ctx.fillStyle = "#888"; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      ctx.restore();
      if (u.clone) { ctx.fillStyle = "rgba(120,200,255,0.45)"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    }
    if (u.freeze > 0) { ctx.fillStyle = "rgba(160,220,255,0.55)"; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.fill(); }
    if (u.stun > 0) { ctx.strokeStyle = "#ffe14d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
    if (u.rage > 0) { ctx.strokeStyle = "#c53bd8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
    if (u.slow > 0) { ctx.strokeStyle = "#8fd3ff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
    if (u.hp < u.maxHp) bar(x, y - r - 7, Math.max(14, r * 2), u.hp / u.maxHp, u.team);
    if (u.deploy > 0) {
      // Deploy timer: the ring empties as the unit gets ready.
      ctx.globalAlpha = 1; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      const total = (stat(u.name) || {}).extra.deploy || 1;
      ctx.beginPath(); ctx.arc(x, y, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, u.deploy / total)); ctx.stroke();
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawFx() {
    for (const f of G.fx) {
      const p = Math.min(1, f.t / f.dur);
      const x = tx(f.x), y = ty(f.y);
      if (f.kind === "target") { ctx.strokeStyle = f.team === 0 ? "rgba(80,160,255,0.8)" : "rgba(255,90,80,0.8)"; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, f.r * TILE, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      if (f.kind === "blast") { ctx.fillStyle = `rgba(255,${f.name === "Zap" || f.name === "Lightning" ? 230 : 150},60,${0.6 * (1 - p)})`; ctx.beginPath(); ctx.arc(x, y, f.r * TILE * (0.6 + p * 0.5), 0, Math.PI * 2); ctx.fill(); }
      if (f.kind === "boom") { ctx.fillStyle = `rgba(255,120,40,${0.7 * (1 - p)})`; ctx.beginPath(); ctx.arc(x, y, f.r * TILE * (0.4 + p), 0, Math.PI * 2); ctx.fill(); }
      if (f.kind === "freeze") { ctx.fillStyle = `rgba(170,225,255,${0.35 * (1 - p)})`; ctx.beginPath(); ctx.arc(x, y, f.r * TILE, 0, Math.PI * 2); ctx.fill(); }
      if (f.kind === "dot") { ctx.fillStyle = `rgba(120,230,80,0.22)`; ctx.beginPath(); ctx.arc(x, y, f.r * TILE, 0, Math.PI * 2); ctx.fill(); }
      if (f.kind === "rage") { ctx.fillStyle = `rgba(200,60,220,0.18)`; ctx.beginPath(); ctx.arc(x, y, f.r * TILE, 0, Math.PI * 2); ctx.fill(); }
      if (f.kind === "grave") { ctx.strokeStyle = "rgba(60,60,80,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, f.r * TILE, 0, Math.PI * 2); ctx.stroke(); }
      if (f.kind === "deploy") { ctx.strokeStyle = f.team === 0 ? "rgba(80,160,255," + (1 - p) + ")" : "rgba(255,90,80," + (1 - p) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, f.r * TILE * (0.3 + p), 0, Math.PI * 2); ctx.stroke(); }
      if (f.kind === "roll") { const yy = ty(f.y + f.dir * f.len * p); ctx.fillStyle = "#8a5a2b"; roundRect(x - f.r * TILE, yy - 6, f.r * TILE * 2, 12, 6); ctx.fill(); ctx.fillStyle = "#c9955a"; ctx.fillRect(x - f.r * TILE + 4, yy - 2, f.r * TILE * 2 - 8, 2); }
      if (f.kind === "hit") { ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - p)})`; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
      if (f.kind === "pop") { ctx.globalAlpha = 1 - p; const im = img(f.name); const r = f.r * TILE * (1 + p * 0.5); if (im) ctx.drawImage(im, x - r, y - r * 1.2 - p * 10, r * 2, r * 2.4); ctx.globalAlpha = 1; }
    }
    for (const pr of G.projectiles) {
      const p = pr.t / pr.dur;
      let ex, ey;
      if (pr.kind === "spell") { ex = tx(pr.tx); ey = ty(pr.ty); } else if (pr.target) { ex = tx(pr.target.x); ey = ty(pr.target.y) - (pr.target.flies ? 10 : 0); } else continue;
      const sx = tx(pr.x), sy = ty(pr.y);
      const x = sx + (ex - sx) * p, y = sy + (ey - sy) * p - Math.sin(p * Math.PI) * (pr.kind === "spell" ? 40 : 8);
      ctx.fillStyle = pr.kind === "spell" ? "#ffb347" : pr.team === 0 ? "#cfe6ff" : "#ffd3cf";
      ctx.beginPath(); ctx.arc(x, y, pr.kind === "spell" ? 5 : 2.5, 0, Math.PI * 2); ctx.fill();
    }
    for (const f of G.floats) {
      ctx.globalAlpha = 1 - f.t / 0.9;
      ctx.fillStyle = f.team === 0 ? "#dff" : "#ffe9e6";
      ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 2;
      ctx.strokeText(f.text, tx(f.x), ty(f.y) - f.t * 18); ctx.fillText(f.text, tx(f.x), ty(f.y) - f.t * 18);
      ctx.globalAlpha = 1;
    }
  }

  function drawHud() {
    // Top bar: crowns and timer
    ctx.fillStyle = "#1b2128"; ctx.fillRect(0, 0, CW, TOP);
    const left = Math.max(0, timeLeft());
    const m = Math.floor(left / 60), s = Math.floor(left % 60);
    ctx.fillStyle = G.overtime ? "#ff8a3d" : "#fff"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${m}:${String(s).padStart(2, "0")}`, CW / 2, 27);
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#9aa4b2";
    ctx.fillText(G.overtime ? "OVERTIME" : G.time >= 120 ? "2x ELIXIR" : "", CW / 2, 39);
    crowns(60, 22, G.players[1].crowns, "#ff5a4d", oppName);
    // Their elixir, so it is plain the opponent plays by the same rules.
    const oe = G.players[1].elixir;
    for (let i = 0; i < 10; i++) { ctx.fillStyle = "#2b3340"; ctx.fillRect(20 + i * 8, 39, 7, 3); const f = clamp(oe - i, 0, 1); if (f > 0) { ctx.fillStyle = "#d63fd6"; ctx.fillRect(20 + i * 8, 39, 7 * f, 3); } }
    crowns(CW - 60, 22, G.players[0].crowns, "#4da3ff", "You");
    if (G.message && G.time < G.messageUntil) {
      ctx.fillStyle = "rgba(0,0,0,0.55)"; roundRect(CW / 2 - 90, TOP + 110, 180, 28, 8); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(G.message, CW / 2, TOP + 129);
    }
    // Bottom: elixir and hand
    const y0 = TOP + H * TILE;
    ctx.fillStyle = "#1b2128"; ctx.fillRect(0, y0, CW, BOTTOM);
    const p = G.players[0];
    const bx = 44, bw = CW - 88, by = y0 + 8;
    ctx.fillStyle = "#2b3340"; roundRect(bx, by, bw, 10, 5); ctx.fill();
    for (let i = 0; i < 10; i++) {
      const fill = clamp(p.elixir - i, 0, 1);
      if (fill > 0) { ctx.fillStyle = "#d33fd0"; ctx.fillRect(bx + (bw / 10) * i + 1, by + 1, (bw / 10 - 2) * fill, 8); }
    }
    ctx.fillStyle = "#e58ff0"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left"; ctx.fillText(Math.floor(p.elixir), bx + bw + 8, by + 10);
    drop(bx - 18, by + 5, Math.floor(p.elixir));
    // Hand
    const cw = 62, ch = 74, gap = 8, startX = 50;
    for (let i = 0; i < 4; i++) {
      const name = p.hand[i], st = stat(name) || { cost: 0 };
      const x = startX + i * (cw + gap), y = y0 + 28;
      const sel = p.selected === i || (G.pointer && G.pointer.card === i);
      const afford = p.elixir >= st.cost;
      ctx.fillStyle = sel ? "#3b7bd8" : "#2b3340"; roundRect(x - 2, y - 2 - (sel ? 6 : 0), cw + 4, ch + 4, 8); ctx.fill();
      const im = img(name);
      ctx.save(); roundRect(x, y - (sel ? 6 : 0), cw, ch, 6); ctx.clip();
      if (im) ctx.drawImage(im, x, y - (sel ? 6 : 0), cw, ch); else { ctx.fillStyle = "#555"; ctx.fillRect(x, y, cw, ch); }
      if (!afford) { ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x, y - (sel ? 6 : 0), cw, ch); }
      ctx.restore();
      drop(x + 2, y + 4 - (sel ? 6 : 0), st.cost);
      ctx.fillStyle = "#cbd3dd"; ctx.font = "9px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(name.length > 12 ? name.slice(0, 11) + "…" : name, x + cw / 2, y + ch + 10 - (sel ? 6 : 0));
    }
    // Next card
    const nx = 8, ny = y0 + 50;
    ctx.fillStyle = "#9aa4b2"; ctx.font = "8px sans-serif"; ctx.textAlign = "center"; ctx.fillText("NEXT", nx + 16, ny - 4);
    const nim = img(p.next);
    ctx.save(); roundRect(nx, ny, 32, 38, 4); ctx.clip(); if (nim) ctx.drawImage(nim, nx, ny, 32, 38); ctx.restore();
    // Drag ghost
    if (G.pointer && G.pointer.card != null && G.pointer.y < y0) {
      const name = p.hand[G.pointer.card];
      const ok = playable(0, name, G.pointer.x / TILE, (G.pointer.y - TOP) / TILE) && p.elixir >= (stat(name) || {}).cost;
      ctx.strokeStyle = ok ? "rgba(80,255,120,0.9)" : "rgba(255,80,80,0.9)"; ctx.lineWidth = 2;
      const st = stat(name);
      const rr = st && st.type === "S" ? st.range * TILE : 14;
      ctx.beginPath(); ctx.arc(G.pointer.x, G.pointer.y, rr, 0, Math.PI * 2); ctx.stroke();
      const im = img(name); if (im) { ctx.globalAlpha = 0.85; ctx.drawImage(im, G.pointer.x - 16, G.pointer.y - 40, 32, 38); ctx.globalAlpha = 1; }
    }
  }
  function drop(x, y, n) {
    ctx.fillStyle = "#c42fbf"; ctx.beginPath(); ctx.ellipse(x + 9, y + 9, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(n), x + 9, y + 13);
  }
  function crowns(x, y, n, color, label) {
    ctx.fillStyle = "#9aa4b2"; ctx.font = "9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label.length > 14 ? label.slice(0, 13) + "…" : label, x, y + 14);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < n ? color : "#2b3340";
      const cx = x - 16 + i * 16, cy = y - 2;
      ctx.beginPath(); ctx.moveTo(cx - 6, cy + 4); ctx.lineTo(cx - 6, cy - 3); ctx.lineTo(cx - 2, cy); ctx.lineTo(cx, cy - 5); ctx.lineTo(cx + 2, cy); ctx.lineTo(cx + 6, cy - 3); ctx.lineTo(cx + 6, cy + 4); ctx.closePath(); ctx.fill();
    }
  }
  function drawEnd() {
    if (!G.over) return;
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, CW, CH);
    const win = G.result === 0, draw = G.result === -1;
    ctx.fillStyle = draw ? "#fff" : win ? "#5ce08a" : "#ff6b5e"; ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(draw ? "DRAW" : win ? "VICTORY" : "DEFEAT", CW / 2, CH / 2 - 30);
    ctx.fillStyle = "#fff"; ctx.font = "16px sans-serif";
    ctx.fillText(`${G.players[0].crowns} – ${G.players[1].crowns}  vs ${oppName}`, CW / 2, CH / 2);
    ctx.fillStyle = "#3b7bd8"; roundRect(CW / 2 - 60, CH / 2 + 22, 120, 36, 10); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.fillText("Play again", CW / 2, CH / 2 + 45);
  }

  function render() {
    drawArena();
    const all = G.units.slice().sort((a, b) => (a.flies - b.flies) || (a.y - b.y));
    for (const t of G.towers) drawTower(t);
    for (const u of all) if (!u.flies) drawUnit(u);
    drawFx();
    for (const u of all) if (u.flies) drawUnit(u);
    drawHud();
    drawEnd();
  }

  // ---- Input --------------------------------------------------------------------
  function pos(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale };
  }
  function handAt(p) {
    const y0 = TOP + H * TILE;
    if (p.y < y0 + 20) return -1;
    const i = Math.floor((p.x - 50) / 70);
    return i >= 0 && i < 4 && p.x >= 50 ? i : -1;
  }
  canvas.addEventListener("pointerdown", (ev) => {
    const p = pos(ev);
    if (G.over) {
      if (Math.abs(p.x - CW / 2) < 60 && p.y > CH / 2 + 22 && p.y < CH / 2 + 58) restart();
      return;
    }
    const i = handAt(p);
    if (i >= 0) { G.players[0].selected = i; G.pointer = { x: p.x, y: p.y, card: i }; canvas.setPointerCapture(ev.pointerId); return; }
    const sel = G.players[0].selected;
    if (sel >= 0 && p.y >= TOP && p.y < TOP + H * TILE) {
      if (playCard(0, sel, p.x / TILE, (p.y - TOP) / TILE)) G.players[0].selected = -1; else nope();
    }
  });
  canvas.addEventListener("pointermove", (ev) => { const p = pos(ev); if (G.pointer) { G.pointer.x = p.x; G.pointer.y = p.y; } });
  canvas.addEventListener("pointerup", (ev) => {
    if (!G.pointer) return;
    const p = pos(ev);
    const y0 = TOP + H * TILE;
    if (p.y >= TOP && p.y < y0) { if (playCard(0, G.pointer.card, p.x / TILE, (p.y - TOP) / TILE)) G.players[0].selected = -1; else nope(); }
    G.pointer = null;
  });
  canvas.addEventListener("pointercancel", () => { G.pointer = null; });
  function nope() { flash(G.players[0].elixir < (stat(G.players[0].hand[G.players[0].selected]) || {}).cost ? "Not enough elixir" : "Can't place there"); }

  function restart() {
    G.time = 0; G.over = false; G.result = null; G.overtime = false; G.sudden = false;
    G.units = []; G.fx = []; G.floats = []; G.projectiles = [];
    for (const p of G.players) { p.elixir = 5; p.crowns = 0; p.selected = -1; }
    init();
  }

  // ---- Loop -----------------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * SPEED;
    last = now;
    const sub = Math.max(1, Math.ceil(dt / 0.025));
    for (let i = 0; i < sub; i++) step(dt / sub);
    render();
    requestAnimationFrame(frame);
  }
  window.addEventListener("resize", resize);
  init();
  resize();
  requestAnimationFrame(frame);
  window.__arena = { G, playCard, stat, step };
})();
