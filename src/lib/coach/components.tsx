"use client";

import { defineComponent } from "@openuidev/react-lang";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod/v4";
import { withBase } from "../base-path";
import { Glyph } from "../components/glyph";
import { cx } from "../components/style";
import { deckStats, findCard, type Rarity } from "./cards";
import { ARCHETYPES, simulateDeck, type MatchupResult } from "./sim";

const RARITY_CLASS: Record<Rarity, string> = {
  Common: "is-common",
  Rare: "is-rare",
  Epic: "is-epic",
  Legendary: "is-legendary",
  Champion: "is-champion",
};

const TYPE_ICON = { Troop: "swords", Spell: "sparkles", Building: "castle" } as const;

/** Two letters that stand in for card art: "Hog Rider" is HR, "P.E.K.K.A" is PE. */
function monogram(name: string) {
  const words = name.replace(/[^A-Za-z0-9 -]/g, "").split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}

/** The card's image file under public/cards (fetched by npm run cards:art). */
const artUrl = (name: string) => withBase(`/cards/${name.toLowerCase().replace(/\./g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`);

/** Card art when its file is there, otherwise the monogram stand-in. */
function Art({ name, size }: { name: string; size: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="cc-mono">{monogram(name)}</span>;
  return <img className={cx("cc-img", `is-${size}`)} src={artUrl(name)} alt="" draggable={false} onError={() => setFailed(true)} />;
}

function Drop({ value, size = "md" }: { value: number | string; size?: "sm" | "md" }) {
  return (
    <span className={cx("cc-drop", size === "sm" && "is-sm")} aria-label={`${value} elixir`}>
      {value}
    </span>
  );
}

export const GameCard = defineComponent({
  name: "GameCard",
  props: z.object({
    name: z.string(),
    size: z.enum(["xs", "sm", "md", "lg"]).optional(),
    note: z.string().optional(),
    tone: z.enum(["neutral", "success", "warning", "danger", "info"]).optional(),
  }),
  description:
    "A card tile looked up by its exact name: elixir drop, rarity color, type icon, name (xs is the tile alone, for a thumbnail beside text). note is a short line under it (\"Win condition\", \"Swap in\"); tone tints the frame. Put it in a Pressable to make it selectable.",
  component: ({ props }) => {
    const card = findCard(props.name);
    const size = props.size ?? "md";
    if (!card) {
      return (
        <div className={cx("cc-card", `is-${size}`, "is-unknown")}>
          <div className="cc-art">
            <span className="cc-mono">?</span>
          </div>
          <div className="cc-name">{String(props.name ?? "")}</div>
          <div className="cc-meta">Unknown card</div>
        </div>
      );
    }
    return (
      <div className={cx("cc-card", `is-${size}`, RARITY_CLASS[card.rarity], props.tone && `tone-${props.tone}`)} title={`${card.name} · ${card.elixir} elixir · ${card.rarity} ${card.type}`}>
        <div className="cc-art">
          <Drop value={card.elixir} size={size === "sm" || size === "xs" ? "sm" : "md"} />
          <Art key={card.name} name={card.name} size={size} />
          {size !== "xs" ? (
            <span className="cc-type">
              <Glyph name={TYPE_ICON[card.type]} size={size === "sm" ? 12 : 14} />
            </span>
          ) : null}
          {card.flies && size !== "xs" ? (
            <span className="cc-fly" title="Flying">
              <Glyph name="feather" size={12} />
            </span>
          ) : null}
        </div>
        {size !== "xs" ? <div className="cc-name">{card.name}</div> : null}
        {size === "md" || size === "lg" ? <div className="cc-meta">{props.note ? props.note : `${card.rarity} ${card.type.toLowerCase()}`}</div> : null}
      </div>
    );
  },
});

export const ElixirMeter = defineComponent({
  name: "ElixirMeter",
  props: z.object({
    value: z.number(),
    label: z.string().optional(),
  }),
  description: "A 10-segment elixir bar filled to value (a deck's average elixir), with the number and an optional label such as the deck style.",
  component: ({ props }) => <ElixirMeterView value={Number.isFinite(props.value) ? props.value : 0} label={props.label ?? "Average elixir"} />,
});

export const DeckSummary = defineComponent({
  name: "DeckSummary",
  props: z.object({ cards: z.array(z.string()) }),
  description:
    "A deck's health check from its card names: average elixir meter, 4-card cycle, and pass/fail checks (win condition, air defense, spells, splash). Recomputes when cards changes.",
  component: ({ props }) => {
    const s = deckStats(props.cards);
    const checks: { ok: boolean; label: string; detail: string }[] = [
      { ok: s.winConditions.length > 0, label: "Win condition", detail: s.winConditions.join(", ") || "None" },
      { ok: s.antiAir.length >= 2, label: "Air defense", detail: s.antiAir.join(", ") || "None" },
      { ok: s.spells.length > 0, label: "Spells", detail: s.spells.join(", ") || "None" },
      { ok: s.splash.length > 0, label: "Splash", detail: s.splash.join(", ") || "None" },
    ];
    return (
      <div className="cc-summary">
        <div className="cc-summary-top">
          <ElixirMeterView value={s.avgElixir} label={s.style} />
          <div className="cc-cycle">
            <span className="cc-cycle-num">{s.cycle}</span>
            <span className="cc-cycle-label">4-card cycle</span>
          </div>
        </div>
        <ul className="cc-checks">
          {checks.map((c) => (
            <li key={c.label} className={cx("cc-check", c.ok ? "is-ok" : "is-bad")}>
              <Glyph name={c.ok ? "check-circle-2" : "alert-triangle"} size={16} />
              <span className="cc-check-label">{c.label}</span>
              <span className="cc-check-detail">{c.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  },
});

/** The meter as a plain React view, for DeckSummary. */
function ElixirMeterView({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(10, value || 0));
  return (
    <div className="cc-meter">
      <div className="cc-meter-head">
        <Drop value={v.toFixed(1)} />
        <div className="cc-meter-text">
          <span className="cc-meter-label">{label}</span>
        </div>
      </div>
      <div className="cc-meter-bar">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="cc-seg">
            <span className="cc-seg-fill" style={{ width: `${Math.max(0, Math.min(1, v - i)) * 100}%` }} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** A small card thumbnail for the sim's lists. */
function MiniCard({ name }: { name: string }) {
  const card = findCard(name);
  return (
    <span className={cx("cc-card", "is-xs", "cc-mini", card ? RARITY_CLASS[card.rarity] : "is-unknown")} title={name}>
      <span className="cc-art">
        {card ? <Drop value={card.elixir} size="sm" /> : null}
        <Art key={name} name={name} size="xs" />
      </span>
    </span>
  );
}

const pct = (n: number) => `${n}%`;
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export const DeckSim = defineComponent({
  name: "DeckSim",
  props: z.object({
    cards: z.array(z.string()),
    opponent: z.string().optional(),
  }),
  description:
    "Battle simulator for a deck: plays 150 quick matches against each common archetype (Hog Cycle, Golem Beatdown, Lava Loon, Log Bait, X-Bow Siege, Mega Knight, P.E.K.K.A Bridge Spam, Graveyard), shows win rates, the change since the last swap, the push that beats the deck and a step-through sample battle. Reruns whenever cards changes. opponent preselects one archetype.",
  component: function DeckSimView({ props }) {
    const cards = (Array.isArray(props.cards) ? props.cards : []).map(String);
    const key = cards.join("|");
    const [salt, setSalt] = useState(0);
    const [picked, setPicked] = useState<string | null>(null);
    const [step, setStep] = useState(0);
    const results = useMemo(() => (cards.length ? simulateDeck(cards, undefined, salt) : []), [key, salt]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep the previous deck's results to show what the last swap changed.
    const history = useRef<{ key: string; results: MatchupResult[] } | null>(null);
    const [previous, setPrevious] = useState<{ key: string; results: MatchupResult[] } | null>(null);
    useEffect(() => {
      const last = history.current;
      if (last && last.key !== key) setPrevious(last);
      history.current = { key, results };
    }, [key, results]);
    const prev = previous && previous.key !== key ? previous.results : null;

    const selectedName = picked ?? ARCHETYPES.find((a) => a.name.toLowerCase() === String(props.opponent ?? "").toLowerCase())?.name ?? results.slice().sort((a, b) => a.winRate - b.winRate)[0]?.archetype;
    const selected = results.find((r) => r.archetype === selectedName) ?? results[0];
    useEffect(() => setStep(0), [selectedName, key, salt]);

    if (!results.length) return <div className="cc-sim cc-sim-empty">Add cards to simulate.</div>;
    const overall = Math.round(results.reduce((s, r) => s + r.winRate, 0) / results.length);
    const prevOverall = prev ? Math.round(prev.reduce((s, r) => s + r.winRate, 0) / prev.length) : null;
    const events = selected.sample.events;
    const shown = events.slice(0, step + 1);
    const dealt = shown.filter((e) => e.kind === "attack").reduce((s, e) => s + e.damage, 0);
    const taken = shown.filter((e) => e.kind === "defend").reduce((s, e) => s + e.damage, 0);
    const current = events[Math.min(step, events.length - 1)];

    return (
      <div className="cc-sim">
        <div className="cc-sim-head">
          <div className="cc-sim-score">
            <span className="cc-sim-big">{pct(overall)}</span>
            <span className="cc-sim-sub">
              average win rate
              {prevOverall !== null && prevOverall !== overall ? (
                <span className={cx("cc-delta", overall > prevOverall ? "is-up" : "is-down")}>{signed(overall - prevOverall)} since last swap</span>
              ) : null}
            </span>
          </div>
          <button type="button" className="cc-sim-rerun" onClick={() => setSalt((n) => n + 1)}>
            <Glyph name="refresh-cw" size={14} /> Run again
          </button>
        </div>

        <div className="cc-sim-rows" role="list">
          {results.map((r) => {
            const before = prev?.find((p) => p.archetype === r.archetype)?.winRate;
            const delta = before === undefined ? 0 : r.winRate - before;
            const tone = r.winRate >= 55 ? "is-good" : r.winRate < 40 ? "is-bad" : "is-mid";
            return (
              <button type="button" role="listitem" key={r.archetype} className={cx("cc-sim-row", r.archetype === selected.archetype && "is-selected")} onClick={() => setPicked(r.archetype)}>
                <span className="cc-sim-name">{r.archetype}</span>
                <span className="cc-sim-bar">
                  <span className={cx("cc-sim-fill", tone)} style={{ width: `${r.winRate}%` }} />
                  {before !== undefined ? <span className="cc-sim-ghost" style={{ left: `${before}%` }} /> : null}
                </span>
                <span className="cc-sim-pct">{pct(r.winRate)}</span>
                <span className={cx("cc-delta", delta > 0 ? "is-up" : delta < 0 ? "is-down" : "is-flat")}>{delta ? signed(delta) : ""}</span>
              </button>
            );
          })}
        </div>

        <div className="cc-sim-detail">
          <div className="cc-sim-facts">
            {selected.worstPush ? (
              <div className="cc-sim-fact is-bad">
                <span className="cc-sim-label">Beats you most</span>
                <span className="cc-sim-cards">{selected.worstPush.cards.map((c) => <MiniCard key={c} name={c} />)}</span>
                <span className="cc-sim-text">
                  Gets through {pct(selected.worstPush.failRate)} of the time. {selected.worstPush.reason}.
                </span>
              </div>
            ) : null}
            {selected.bestDefender ? (
              <div className="cc-sim-fact is-good">
                <span className="cc-sim-label">Best defender</span>
                <span className="cc-sim-cards">
                  <MiniCard name={selected.bestDefender} />
                </span>
                <span className="cc-sim-text">{selected.bestDefender} stops the most pushes.</span>
              </div>
            ) : null}
          </div>

          {current ? (
            <div className="cc-sim-replay">
              <div className="cc-sim-replay-head">
                <span className="cc-sim-label">Sample battle vs {selected.archetype}</span>
                <span className="cc-sim-tally">
                  <span className="is-good">{dealt}% dealt</span> · <span className="is-bad">{taken}% taken</span>
                </span>
              </div>
              <div className={cx("cc-sim-event", current.kind === "attack" ? "is-attack" : "is-defend", current.success ? "is-ok" : "is-fail")}>
                <span className="cc-sim-time">
                  {Math.floor(current.t / 60)}:{String(current.t % 60).padStart(2, "0")}
                </span>
                <div className="cc-sim-event-body">
                  <div className="cc-sim-event-line">
                    <span className="cc-sim-who">{current.kind === "attack" ? "You attack" : "They push"}</span>
                    <span className="cc-sim-cards">{current.cards.map((c) => <MiniCard key={c} name={c} />)}</span>
                  </div>
                  <div className="cc-sim-event-line">
                    <span className="cc-sim-who">Your hand · {current.elixir} elixir</span>
                    <span className="cc-sim-cards">
                      {current.hand.map((c) => (
                        <span key={c} className={cx("cc-sim-handcard", current.played.includes(c) && "is-played")}>
                          <MiniCard name={c} />
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="cc-sim-note">
                    <Glyph name={current.success ? (current.kind === "attack" ? "swords" : "shield-check") : "shield-alert"} size={15} />
                    {current.note}
                    {current.damage ? <strong>{current.kind === "attack" ? ` +${current.damage}%` : ` −${current.damage}%`}</strong> : null}
                  </div>
                </div>
              </div>
              <div className="cc-sim-steps">
                <button type="button" onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0} aria-label="Previous moment">
                  <Glyph name="chevron-left" size={16} />
                </button>
                <span className="cc-sim-track">
                  {events.map((e, i) => (
                    <span
                      key={i}
                      className={cx("cc-sim-dot", e.kind === "attack" ? "is-attack" : "is-defend", e.success ? "is-ok" : "is-fail", i === step && "is-current")}
                      onClick={() => setStep(i)}
                    />
                  ))}
                </span>
                <button type="button" onClick={() => setStep((n) => Math.min(events.length - 1, n + 1))} disabled={step >= events.length - 1} aria-label="Next moment">
                  <Glyph name="chevron-right" size={16} />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <p className="cc-sim-caveat">Toy model of elixir, hand cycle and counters, scored against a typical ladder deck. Not real match data.</p>
      </div>
    );
  },
});

const ARENA_OPPONENTS = ARCHETYPES.map((a) => a.name);

export const Arena = defineComponent({
  name: "Arena",
  props: z.object({
    cards: z.array(z.string()),
    opponent: z.string().optional(),
  }),
  description:
    "A playable arena: the user battles the deck in cards against an AI running an archetype deck (Hog Cycle, Golem Beatdown, Lava Loon, Log Bait, X-Bow Siege, Mega Knight, P.E.K.K.A Bridge Spam, Graveyard). Towers, bridges, elixir, a cycling hand, tap or drag to place cards, 3 minutes plus overtime. Restarts with the new deck whenever cards changes.",
  component: function ArenaView({ props }) {
    const cards = (Array.isArray(props.cards) ? props.cards : []).map(String).filter(Boolean);
    const [opponent, setOpponent] = useState<string>(() => ARENA_OPPONENTS.find((a) => a.toLowerCase() === String(props.opponent ?? "").toLowerCase()) ?? "Hog Cycle");
    const [result, setResult] = useState<{ winner: number; crowns: [number, number]; opponent: string } | null>(null);
    const [run, setRun] = useState(0);
    const frame = useRef<HTMLIFrameElement>(null);
    const key = cards.join("|");
    const src = `${withBase("/arena/index.html")}#deck=${encodeURIComponent(cards.join(","))}&opp=${encodeURIComponent(opponent)}&run=${run}`;

    useEffect(() => {
      const onMessage = (event: MessageEvent) => {
        if (event.source !== frame.current?.contentWindow) return;
        const d = event.data as { type?: string; winner?: number; crowns?: [number, number]; opponent?: string };
        if (d?.type === "coach-arena-result" && typeof d.winner === "number" && Array.isArray(d.crowns)) setResult({ winner: d.winner, crowns: d.crowns, opponent: d.opponent ?? opponent });
      };
      window.addEventListener("message", onMessage);
      return () => window.removeEventListener("message", onMessage);
    }, [opponent]);
    useEffect(() => setResult(null), [key, opponent, run]);

    if (cards.length < 8) return <div className="cc-sim-empty">Add 8 cards to battle.</div>;
    return (
      <div className="cc-arena">
        <div className="cc-arena-bar">
          <label className="cc-arena-opp">
            <span className="cc-sim-label">Opponent</span>
            <select value={opponent} onChange={(e) => setOpponent(e.target.value)}>
              {ARENA_OPPONENTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          {result ? (
            <span className={cx("cc-arena-result", result.winner === 0 ? "is-win" : result.winner === 1 ? "is-loss" : "is-draw")}>
              {result.winner === 0 ? "Victory" : result.winner === 1 ? "Defeat" : "Draw"} {result.crowns[0]}–{result.crowns[1]}
            </span>
          ) : null}
          <button type="button" className="cc-sim-rerun" onClick={() => setRun((n) => n + 1)}>
            <Glyph name="rotate-ccw" size={14} /> Restart
          </button>
        </div>
        <div className="cc-arena-frame">
          <iframe key={`${key}|${opponent}|${run}`} ref={frame} title={`Arena vs ${opponent}`} src={src} sandbox="allow-scripts" referrerPolicy="no-referrer" />
        </div>
        <p className="cc-sim-caveat">Tap a card, then tap your half of the arena (or drag the card). Fan-made arena with simplified rules and stats.</p>
      </div>
    );
  },
});
