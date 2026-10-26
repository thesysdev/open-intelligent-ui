"use client";

import { defineComponent, reactive, useIsStreaming, useStateField } from "@openuidev/react-lang";
import type { Move, PieceSymbol, Square } from "chess.js";
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { z } from "zod/v4";
import { Glyph } from "../components/glyph";
import { cx } from "../components/style";
import { bestMove, lineProgress, newGame, openingChecks, parsePiece, positionInfo, replay, tryMove } from "./position";

// Filled glyphs for both colors, tinted by CSS; U+FE0E keeps the pawn from turning into an emoji.
const GLYPH: Record<PieceSymbol, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟︎" };
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const LEVEL = { easy: { depth: 1, jitter: 150 }, medium: { depth: 2, jitter: 40 }, hard: { depth: 2, jitter: 0 } } as const;

function PieceGlyph({ color, type, className }: { color: "w" | "b"; type: PieceSymbol; className?: string }) {
  return (
    <span className={cx("ch-piece", color === "w" ? "is-white" : "is-black", className)} aria-hidden>
      {GLYPH[type]}
    </span>
  );
}

/**
 * A list of strings from whatever a model wrote: a list (nested or not), one
 * string ("e2e4", "e4 d5" or "e2e4, d2d4"), or {from, to} objects. Props reach
 * the component unchecked, so a stray shape must not throw.
 */
export function strings(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string") return value.split(/[\s,]+/).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === "object") {
    const { from, to } = value as { from?: unknown; to?: unknown };
    return typeof from === "string" && typeof to === "string" ? [`${from}${to}`] : [];
  }
  return [];
}

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T) => (options.includes(value as T) ? (value as T) : fallback);

/** The board's props with model mistakes smoothed over: unknown options fall back, lists are lists, fen is a string or nothing. */
export function boardProps(props: Record<string, unknown>) {
  return {
    fen: typeof props.fen === "string" && props.fen.trim() ? props.fen : undefined,
    mode: oneOf(props.mode, ["view", "free", "computer", "line"] as const, "view"),
    side: oneOf(props.side, ["white", "black"] as const, "white"),
    level: oneOf(props.level, ["easy", "medium", "hard"] as const, "medium"),
    line: props.line == null ? null : strings(props.line),
    arrows: strings(props.arrows),
    highlights: strings(props.highlights),
  };
}

const squareName = (s: unknown) => (typeof s === "string" && /^[a-h][1-8]$/i.test(s.trim()) ? (s.trim().toLowerCase() as Square) : null);

/** An arrow from "g1f3", "g1-f3" or a move in the position ("Nf3"). */
function arrowOf(text: unknown, fen: string): { from: Square; to: Square } | null {
  const s = String(text ?? "").trim();
  const squares = /^([a-h][1-8])\s*[-x ]?\s*([a-h][1-8])$/i.exec(s);
  if (squares) return { from: squares[1].toLowerCase() as Square, to: squares[2].toLowerCase() as Square };
  const move = tryMove(newGame(fen), s);
  return move ? { from: move.from, to: move.to } : null;
}

export const ChessBoard = defineComponent({
  name: "ChessBoard",
  props: z.object({
    moves: reactive(z.array(z.string())),
    fen: z.string().optional(),
    mode: z.enum(["view", "free", "computer", "line"]).optional(),
    side: z.enum(["white", "black"]).optional(),
    line: z.array(z.string()).optional(),
    level: z.enum(["easy", "medium", "hard"]).optional(),
    arrows: z.array(z.string()).optional(),
    highlights: z.array(z.string()).optional(),
  }),
  description:
    'A board showing the position after moves (SAN, from fen or the start). Pass a $variable as moves and the user\'s moves append to it. mode: "view" (default, no moving), "free" (user moves both sides), "computer" (user plays side, the built-in engine answers at level), "line" (user must play side\'s moves of line, a full move list from the same start; the board plays the other side and rejects wrong moves). side also turns the board. arrows is a list of "g1f3" or SAN moves in the shown position, e.g. [@BestMove($moves)]; highlights is a list of squares.',
  component: function ChessBoardView({ props: raw, statementId }) {
    const id = useId();
    const field = useStateField(statementId || id, raw.moves);
    const streaming = useIsStreaming();
    const props = boardProps(raw);
    const { mode, side } = props;
    const sideCode = side === "white" ? "w" : "b";
    const moves = useMemo(() => strings(field.value), [field.value]);
    const key = moves.join(" ");
    const state = useMemo(() => replay(moves, props.fen), [key, props.fen]); // eslint-disable-line react-hooks/exhaustive-deps
    const { game, played } = state;
    const fen = game.fen();
    const turn = game.turn();
    const over = game.isGameOver();
    const line = props.line;
    const progress = mode === "line" && line ? lineProgress(state.san, line, props.fen) : null;

    const [selected, setSelected] = useState<Square | null>(null);
    const [drag, setDrag] = useState<{ from: Square; x: number; y: number } | null>(null);
    const [wrong, setWrong] = useState<Square | null>(null);
    const [hint, setHint] = useState(false);
    const [thinking, setThinking] = useState(false);
    const boardRef = useRef<HTMLDivElement>(null);

    const canMove = !streaming && !over && mode !== "view" && (mode === "free" || turn === sideCode) && !(progress && (progress.done || !progress.onLine));
    const targets = useMemo(() => (selected ? game.moves({ square: selected, verbose: true }) : []), [selected, game]);

    const push = (san: string) => field.setValue([...state.san, san]);

    // The board's own replies: the engine in computer mode, the line's next move in line mode.
    useEffect(() => {
      if (streaming || over || turn === sideCode) return;
      let reply: (() => string | null) | null = null;
      if (mode === "computer") {
        const level = LEVEL[props.level];
        reply = () => bestMove(state.san, props.fen, level.depth, level.jitter);
      } else if (mode === "line" && progress?.onLine && progress.next) {
        const next = progress.next;
        reply = () => next;
      }
      if (!reply) return;
      setThinking(true);
      // Wait a beat so the user's move is drawn before the search blocks the thread.
      const timer = window.setTimeout(() => {
        const san = reply!();
        setThinking(false);
        if (san) push(san);
      }, mode === "computer" ? 350 : 450);
      return () => {
        window.clearTimeout(timer);
        setThinking(false);
      };
    }, [key, mode, streaming]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      setSelected(null);
      setHint(false);
    }, [key]);

    const attempt = (from: Square, to: Square) => {
      const move = targets.find((m) => m.from === from && m.to === to && (!m.promotion || m.promotion === "q"));
      if (!move) return false;
      if (progress && progress.next && move.san !== progress.next) {
        setWrong(to);
        window.setTimeout(() => setWrong(null), 700);
        setSelected(null);
        return true;
      }
      push(move.san);
      return true;
    };

    const ownPiece = (sq: Square) => {
      const p = game.get(sq);
      return !!p && (mode === "free" ? p.color === turn : p.color === sideCode && turn === sideCode);
    };

    const squareAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest("[data-square]") as HTMLElement | null)?.dataset.square as Square | undefined;

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if (!canMove) return;
      const sq = squareAt(event.clientX, event.clientY);
      if (!sq) return;
      if (selected && selected !== sq && attempt(selected, sq)) return;
      if (ownPiece(sq)) {
        setSelected(sq);
        setDrag({ from: sq, x: event.clientX, y: event.clientY });
        boardRef.current?.setPointerCapture(event.pointerId);
      } else setSelected(null);
    };
    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
      if (drag) setDrag({ ...drag, x: event.clientX, y: event.clientY });
    };
    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
      if (!drag) return;
      const sq = squareAt(event.clientX, event.clientY);
      setDrag(null);
      if (sq && sq !== drag.from) attempt(drag.from, sq);
    };

    const last: Move | undefined = played.at(-1);
    const checkSquare = game.inCheck() ? game.board().flat().find((p) => p && p.type === "k" && p.color === turn)?.square : null;
    const highlights = new Set(props.highlights.map(squareName).filter(Boolean));
    const arrows = props.arrows.map((a) => arrowOf(a, fen)).filter((a): a is { from: Square; to: Square } => !!a);
    if (hint && progress?.next) {
      const a = arrowOf(progress.next, fen);
      if (a) arrows.push(a);
    }
    const ranks = side === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = side === "white" ? FILES : [...FILES].reverse();
    const at = (sq: Square) => ({ x: files.indexOf(sq[0]) + 0.5, y: ranks.indexOf(Number(sq[1])) + 0.5 });
    const rect = boardRef.current?.getBoundingClientRect();

    const status = streaming
      ? null
      : over
        ? positionInfo(state.san, props.fen).status
        : progress && !progress.onLine
          ? "Off the line"
          : progress?.done
            ? "Line complete"
            : thinking
              ? mode === "computer"
                ? "Thinking…"
                : "Opponent to move…"
              : wrong
                ? "Not that one, try again"
                : mode === "view"
                  ? null
                  : mode === "free"
                    ? `${turn === "w" ? "White" : "Black"} to move`
                    : game.inCheck()
                      ? "Check! Your move"
                      : "Your move";

    const undo = () => {
      // In computer and line modes, take back the reply too, so it is the user's move again.
      const first = newGame(props.fen).turn();
      const turnAfter = (n: number) => (n % 2 === 0 ? first : first === "w" ? "b" : "w");
      let n = state.san.length - 1;
      if (mode !== "free") while (n > 0 && turnAfter(n) !== sideCode) n -= 1;
      field.setValue(state.san.slice(0, Math.max(0, n)));
    };

    return (
      <div className="ch-wrap">
        <div
          ref={boardRef}
          className={cx("ch-board", canMove && "is-live")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
          role="img"
          aria-label={`Chess position: ${fen}`}
        >
          {ranks.map((rank, r) =>
            files.map((file, f) => {
              const sq = `${file}${rank}` as Square;
              const piece = game.get(sq);
              const dark = (FILES.indexOf(file) + rank) % 2 === 1;
              const target = targets.find((m) => m.to === sq);
              return (
                <div
                  key={sq}
                  data-square={sq}
                  className={cx(
                    "ch-sq",
                    dark ? "is-dark" : "is-light",
                    (last?.from === sq || last?.to === sq) && "is-last",
                    selected === sq && "is-selected",
                    highlights.has(sq) && "is-marked",
                    checkSquare === sq && "is-check",
                    wrong === sq && "is-wrong",
                  )}
                >
                  {f === 0 ? <span className="ch-coord is-rank">{rank}</span> : null}
                  {r === 7 ? <span className="ch-coord is-file">{file}</span> : null}
                  {piece ? <PieceGlyph color={piece.color} type={piece.type} className={drag?.from === sq ? "is-lifted" : undefined} /> : null}
                  {target ? <span className={cx("ch-dot", target.captured && "is-capture")} /> : null}
                </div>
              );
            }),
          )}
          {arrows.length ? (
            <svg className="ch-arrows" viewBox="0 0 8 8" aria-hidden>
              <defs>
                <marker id={`${id}-head`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto">
                  <path d="M0 0 L10 5 L0 10 z" className="ch-arrow-head" />
                </marker>
              </defs>
              {arrows.map((a, i) => {
                const p = at(a.from);
                const q = at(a.to);
                const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
                const end = { x: q.x - ((q.x - p.x) / len) * 0.35, y: q.y - ((q.y - p.y) / len) * 0.35 };
                return <line key={i} x1={p.x} y1={p.y} x2={end.x} y2={end.y} className="ch-arrow" markerEnd={`url(#${id}-head)`} />;
              })}
            </svg>
          ) : null}
          {drag && rect ? (
            <span className="ch-ghost" style={{ left: drag.x - rect.left, top: drag.y - rect.top, width: rect.width / 8, height: rect.width / 8 }}>
              {(() => {
                const p = game.get(drag.from);
                return p ? <PieceGlyph color={p.color} type={p.type} /> : null;
              })()}
            </span>
          ) : null}
        </div>
        {mode !== "view" ? (
          <div className="ch-bar">
            <span className={cx("ch-status", wrong && "is-bad", (progress?.done || game.isCheckmate()) && "is-good")}>
              {thinking ? <span className="ch-spinner" /> : null}
              {status}
            </span>
            <span className="ch-tools">
              {mode === "line" && progress?.next && turn === sideCode ? (
                <button type="button" className="ch-tool" onClick={() => setHint(!hint)} disabled={streaming}>
                  <Glyph name="lightbulb" size={14} /> Hint
                </button>
              ) : null}
              <button type="button" className="ch-tool" onClick={undo} disabled={streaming || !state.san.length}>
                <Glyph name="undo-2" size={14} /> Undo
              </button>
              <button type="button" className="ch-tool" onClick={() => field.setValue([])} disabled={streaming || !state.san.length}>
                <Glyph name="rotate-ccw" size={14} /> Reset
              </button>
            </span>
          </div>
        ) : null}
        {state.bad && !streaming ? <div className="ch-warn">Stopped at {state.bad}: not a legal move here.</div> : null}
      </div>
    );
  },
});

export const MoveList = defineComponent({
  name: "MoveList",
  props: z.object({ moves: z.array(z.string()), fen: z.string().optional() }),
  description: "The moves as a numbered score sheet (1. e4 e5 2. Nf3 …), the latest one marked.",
  component: ({ props }) => {
    const { san, game } = replay(strings(props.moves), props.fen);
    // A position with black to move starts the sheet on "1...".
    const start = newGame(props.fen);
    const offset = start.turn() === "b" ? 1 : 0;
    const first = start.moveNumber();
    const cells: (string | null)[] = [...Array(offset).fill(null), ...san];
    const rows = Array.from({ length: Math.ceil(cells.length / 2) }, (_, i) => cells.slice(i * 2, i * 2 + 2));
    if (!san.length) return <div className="ch-moves is-empty">No moves yet</div>;
    return (
      <ol className="ch-moves" aria-label="Moves">
        {rows.map((pair, i) => (
          <li key={i} className="ch-move-row">
            <span className="ch-move-no">{first + i}.</span>
            {pair.map((m, j) => (
              <span key={j} className={cx("ch-move", i * 2 + j === cells.length - 1 && "is-latest")}>
                {m ?? "…"}
              </span>
            ))}
          </li>
        ))}
        {game.isGameOver() ? <li className="ch-move-result">{positionInfo(san, props.fen).result}</li> : null}
      </ol>
    );
  },
});

export const EvalBar = defineComponent({
  name: "EvalBar",
  props: z.object({ value: z.number(), label: z.string().optional() }),
  description: "A white-versus-black bar for a score in pawns from white's side (+1.5 is white better, ±99 is mate), such as @Score($moves).",
  component: ({ props }) => {
    const v = typeof props.value === "number" && Number.isFinite(props.value) ? props.value : 0;
    const label = typeof props.label === "string" && props.label ? props.label : "Evaluation";
    const mate = Math.abs(v) >= 99;
    // Squash so a pawn or two moves the bar visibly but a queen does not max it out.
    const share = mate ? (v > 0 ? 100 : 0) : 50 + 50 * Math.tanh(v / 4);
    const text = mate ? (v > 0 ? "White mates" : "Black mates") : `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
    return (
      <div className="ch-eval">
        <div className="ch-eval-head">
          <span className="ch-eval-label">{label}</span>
          <span className="ch-eval-num">{text}</span>
        </div>
        <div className="ch-eval-bar" role="meter" aria-valuemin={-10} aria-valuemax={10} aria-valuenow={v} aria-label={label}>
          <span className="ch-eval-white" style={{ width: `${share}%` }} />
        </div>
      </div>
    );
  },
});

export const PositionSummary = defineComponent({
  name: "PositionSummary",
  props: z.object({ moves: z.array(z.string()), fen: z.string().optional(), side: z.enum(["white", "black"]).optional() }),
  description:
    "A position's health check after moves: whose move and check or mate, material with captured pieces, then side's opening checks (pieces developed, king castled, center pawns, early queen). Recomputes when moves changes.",
  component: ({ props }) => {
    const { game, played, san } = replay(strings(props.moves), props.fen);
    const info = positionInfo(san, props.fen);
    const side = props.side === "black" ? "b" : "w";
    const o = openingChecks(game, played, side);
    const m = info.material;
    const checks: { ok: boolean; label: string; detail: string }[] = [
      { ok: o.developed >= 3 || o.moves < 4, label: "Development", detail: `${o.developed} of 4 minor pieces out` },
      { ok: o.castled || (o.moves < 8 && o.canCastle), label: "King safety", detail: o.castled ? "Castled" : o.canCastle ? (o.moves < 8 ? "Can still castle" : "Not castled yet") : "Lost castling rights" },
      { ok: o.centerPawns.length > 0 || o.moves < 2, label: "Center", detail: o.centerPawns.length ? `Pawns on ${o.centerPawns.join(", ")}` : "No center pawns" },
      { ok: o.earlyQueenMoves < 2, label: "Queen", detail: o.earlyQueenMoves < 2 ? "Not overused" : `Moved ${o.earlyQueenMoves} times early` },
    ];
    return (
      <div className="ch-summary">
        <div className="ch-summary-top">
          <div className={cx("ch-turn", info.checkmate && "is-mate", info.inCheck && !info.checkmate && "is-check")}>
            <span className={cx("ch-turn-dot", info.turn === "white" ? "is-white" : "is-black")} />
            <span>{info.status}</span>
          </div>
          <div className="ch-material">
            <span className="ch-material-num">{m.diff === 0 ? "=" : `+${Math.abs(m.diff)}`}</span>
            <span className="ch-material-label">{m.diff === 0 ? "material even" : m.diff > 0 ? "White ahead" : "Black ahead"}</span>
          </div>
        </div>
        <div className="ch-captured">
          <CapturedRow label="White took" pieces={m.capturedByWhite} color="b" />
          <CapturedRow label="Black took" pieces={m.capturedByBlack} color="w" />
        </div>
        <ul className="ch-checks">
          {checks.map((c) => (
            <li key={c.label} className={cx("ch-check", c.ok ? "is-ok" : "is-bad")}>
              <Glyph name={c.ok ? "check-circle-2" : "alert-triangle"} size={16} />
              <span className="ch-check-label">{c.label}</span>
              <span className="ch-check-detail">{c.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  },
});

function CapturedRow({ label, pieces, color }: { label: string; pieces: string[]; color: "w" | "b" }) {
  return (
    <div className="ch-captured-row">
      <span className="ch-captured-label">{label}</span>
      <span className="ch-captured-pieces">
        {pieces.length
          ? pieces.map((p, i) => {
              const piece = parsePiece(p);
              return piece ? <PieceGlyph key={i} color={color} type={piece.type} /> : null;
            })
          : <span className="ch-none">nothing</span>}
      </span>
    </div>
  );
}

export const ChessPiece = defineComponent({
  name: "ChessPiece",
  props: z.object({ piece: z.string(), size: z.enum(["sm", "md", "lg"]).optional() }),
  description: 'One piece glyph, written "wN", "bq" or "white knight", for a legend or beside text.',
  component: ({ props }) => {
    const piece = parsePiece(props.piece);
    if (!piece) return null;
    return (
      <span className={cx("ch-chip", `is-${props.size ?? "md"}`)}>
        <PieceGlyph color={piece.color} type={piece.type} />
      </span>
    );
  },
});
