import { Chess, type Move, type PieceSymbol, type Square } from "chess.js";

/**
 * Chess positions for the coach demo, as a start FEN plus a list of moves.
 * A game held as moves (not a FEN) keeps its history, so a page can undo,
 * step through a line or check a trainee against an opening. Move rules come
 * from chess.js; the evaluation and search below are a small built-in
 * engine for sparring and hints, not a strong one.
 */

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type Color = "white" | "black";

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NAME: Record<PieceSymbol, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

/** A new game at fen, or the start position when fen is missing or not valid. */
export function newGame(fen?: string | null) {
  if (fen) {
    try {
      return new Chess(fen);
    } catch {
      // fall through to the start position
    }
  }
  return new Chess();
}

/** Plays one move written loosely ("Nf3", "nf3", "g1f3", "O-O", "e8=Q"); the move, or null if it is not legal. */
export function tryMove(game: Chess, move: string): Move | null {
  // Drop a move number ("1.e4", "12...Nf6") and annotations ("Nf3!?").
  const text = String(move ?? "").trim().replace(/^\d+\.+\s*/, "").replace(/[!?]+$/, "").replace(/0-0-0/g, "O-O-O").replace(/0-0/g, "O-O");
  if (!text) return null;
  try {
    return game.move(text, { strict: false });
  } catch {
    // A capital-B square move like "Bb5" is fine; a lowercase piece letter is not, so retry with it raised.
    const raised = /^[nbrqk][a-h1-8x]/.test(text) ? text[0].toUpperCase() + text.slice(1) : null;
    if (!raised) return null;
    try {
      return game.move(raised, { strict: false });
    } catch {
      return null;
    }
  }
}

/** The game after moves from fen: the moves that played (as SAN) and the first that did not. */
export function replay(moves: unknown, fen?: string | null) {
  const game = newGame(fen);
  const played: Move[] = [];
  let bad: string | null = null;
  for (const m of Array.isArray(moves) ? moves : []) {
    const move = tryMove(game, String(m));
    if (!move) {
      bad = String(m);
      break;
    }
    played.push(move);
  }
  return { game, played, san: played.map((m) => m.san), bad, startFen: newGame(fen).fen() };
}

const colorName = (c: "w" | "b"): Color => (c === "w" ? "white" : "black");

/** Material on the board and what each side has captured. */
export function material(game: Chess) {
  const left = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
  for (const row of game.board()) for (const sq of row) if (sq) left[sq.color][sq.type] += 1;
  const full = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const points = (c: "w" | "b") => (Object.keys(VALUE) as PieceSymbol[]).reduce((sum, t) => sum + VALUE[t] * left[c][t], 0);
  // Pieces a side is missing, clamped at zero so a promoted queen does not count as a captured one.
  const missing = (c: "w" | "b") => (["q", "r", "b", "n", "p"] as PieceSymbol[]).flatMap((t) => Array(Math.max(0, full[t] - left[c][t])).fill(PIECE_NAME[t]) as string[]);
  const white = points("w");
  const black = points("b");
  return { white, black, diff: white - black, capturedByWhite: missing("b"), capturedByBlack: missing("w") };
}

/** Facts about the position after moves: turn, check, result, material. */
export function positionInfo(moves: unknown, fen?: string | null) {
  const { game, san, bad } = replay(moves, fen);
  const turn = colorName(game.turn());
  const checkmate = game.isCheckmate();
  const draw = game.isDraw() || game.isStalemate();
  const result = checkmate ? (turn === "white" ? "0-1" : "1-0") : draw ? "1/2-1/2" : null;
  const status = checkmate
    ? `Checkmate, ${turn === "white" ? "black" : "white"} wins`
    : game.isStalemate()
      ? "Stalemate"
      : game.isThreefoldRepetition()
        ? "Draw by repetition"
        : game.isInsufficientMaterial()
          ? "Draw, not enough material"
          : game.isDraw()
            ? "Draw"
            : game.inCheck()
              ? `${cap(turn)} is in check`
              : `${cap(turn)} to move`;
  return {
    fen: game.fen(),
    moves: san,
    ply: san.length,
    moveNumber: game.moveNumber(),
    turn,
    lastMove: san.at(-1) ?? null,
    inCheck: game.inCheck(),
    checkmate,
    stalemate: game.isStalemate(),
    draw,
    gameOver: game.isGameOver(),
    result,
    status,
    legalMoves: game.moves().length,
    material: material(game),
    illegal: bad,
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Opening health for one side: development, king safety, center, queen. */
export function openingChecks(game: Chess, history: Move[], side: "w" | "b") {
  const home = side === "w" ? "1" : "8";
  const minorHomes = side === "w" ? ["b1", "c1", "f1", "g1"] : ["b8", "c8", "f8", "g8"];
  const undeveloped = minorHomes.filter((sq) => {
    const p = game.get(sq as Square);
    return p && p.color === side && (p.type === "n" || p.type === "b");
  });
  const castled = history.some((m) => m.color === side && (m.san.startsWith("O-O")));
  const king = game.board().flat().find((p) => p && p.type === "k" && p.color === side);
  const rights = game.getCastlingRights(side);
  const centerPawns = ["d4", "e4", "d5", "e5"].filter((sq) => {
    const p = game.get(sq as Square);
    return p && p.color === side && p.type === "p";
  });
  const ownMoves = history.filter((m) => m.color === side);
  const queenMoves = ownMoves.slice(0, 10).filter((m) => m.piece === "q").length;
  return {
    developed: 4 - undeveloped.length,
    undeveloped,
    castled,
    canCastle: rights.k || rights.q,
    kingSquare: king?.square ?? null,
    kingHome: king?.square?.endsWith(home) ?? false,
    centerPawns,
    earlyQueenMoves: queenMoves,
    moves: ownMoves.length,
  };
}

/** How far moves follow line (a full line from the same start): the next move and whether it went wrong. */
export function lineProgress(moves: unknown, line: unknown, fen?: string | null) {
  const played = replay(moves, fen).san;
  const target = replay(line, fen).san;
  let same = 0;
  while (same < played.length && same < target.length && played[same] === target[same]) same += 1;
  const onLine = same === played.length && played.length <= target.length;
  return {
    onLine,
    played: same,
    total: target.length,
    done: onLine && played.length === target.length,
    next: onLine ? (target[played.length] ?? null) : null,
    expected: onLine ? null : (target[same] ?? null),
    wrongMove: onLine ? null : (played[same] ?? null),
  };
}

// Engine: material plus piece-square tables, searched with alpha-beta.
// Tables are from white's side, rank 8 first, so a1 is index 56.
const PST: Record<PieceSymbol, number[]> = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

/** Static score in centipawns from white's side. */
export function evaluate(game: Chess) {
  if (game.isCheckmate()) return game.turn() === "w" ? -100_000 : 100_000;
  if (game.isDraw() || game.isStalemate()) return 0;
  return boardScore(game);
}

/** Material and placement only, for the search's leaves. */
function boardScore(game: Chess) {
  let score = 0;
  const board = game.board();
  for (let r = 0; r < 8; r += 1) {
    for (let f = 0; f < 8; f += 1) {
      const p = board[r][f];
      if (!p) continue;
      const index = p.color === "w" ? r * 8 + f : (7 - r) * 8 + f;
      const v = VALUE[p.type] * 100 + PST[p.type][index];
      score += p.color === "w" ? v : -v;
    }
  }
  return score;
}

/** Captures and promotions first, biggest victim first, so alpha-beta cuts sooner. */
function ordered(game: Chess) {
  const score = (m: Move) => (m.captured ? 10 * VALUE[m.captured] - VALUE[m.piece] : 0) + (m.promotion ? 8 : 0) + (m.san.includes("+") ? 1 : 0);
  return game.moves({ verbose: true }).sort((a, b) => score(b) - score(a));
}

/** Plays out captures at the leaves, so the engine does not stop counting halfway through a trade. */
function quiesce(game: Chess, alpha: number, beta: number, left: number): number {
  const s = boardScore(game);
  const stand = game.turn() === "w" ? s : -s;
  if (stand >= beta || left === 0) return stand;
  if (stand > alpha) alpha = stand;
  for (const m of ordered(game)) {
    if (!m.captured) continue;
    game.move(m);
    const score = -quiesce(game, -beta, -alpha, left - 1);
    game.undo();
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

/** Negamax score for the side to move. Only no-moves endings are checked here: the full draw rules cost too much per node. */
function search(game: Chess, depth: number, alpha: number, beta: number, extend: number): number {
  const list = ordered(game);
  // Mated sooner (more depth left) scores worse, so the engine takes the quickest mate.
  if (!list.length) return game.inCheck() ? -(100_000 + depth) : 0;
  if (depth === 0) return quiesce(game, alpha, beta, 4);
  let best = -Infinity;
  for (const m of list) {
    game.move(m);
    // A check is searched one ply deeper (once per line), so forcing mates show up.
    const ext = extend && m.san.includes("+") ? 1 : 0;
    const score = -search(game, depth - 1 + ext, -beta, -alpha, extend - ext);
    game.undo();
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

const memo = new Map<string, string | null>();

/**
 * The built-in engine's move for the side to move, as SAN (null when the game
 * is over). depth is 1 or 2 plies plus captures; deeper is too slow for the
 * page's main thread. jitter adds up to that many centipawns of noise, for an
 * easier opponent. Exact searches are remembered, since @functions rerun on
 * every change.
 */
export function bestMove(moves: unknown, fen?: string | null, depth = 2, jitter = 0) {
  const { game } = replay(moves, fen);
  if (game.isGameOver()) return null;
  const d = Math.max(1, Math.min(2, Math.round(depth) || 2));
  const key = `${game.fen()}|${d}`;
  if (!jitter && memo.has(key)) return memo.get(key)!;
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const m of ordered(game)) {
    game.move(m);
    const ext = m.san.includes("+") ? 1 : 0;
    const score = -search(game, d - 1 + ext, -Infinity, jitter ? Infinity : -bestScore, 1 - ext) + (jitter ? Math.random() * jitter : 0);
    game.undo();
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  const san = best?.san ?? null;
  if (!jitter) {
    if (memo.size > 200) memo.clear();
    memo.set(key, san);
  }
  return san;
}

/** The score for white after moves, in pawns rounded to a tenth (mate is ±99). */
export function score(moves: unknown, fen?: string | null) {
  const { game } = replay(moves, fen);
  if (game.isCheckmate()) return game.turn() === "w" ? -99 : 99;
  if (game.isDraw()) return 0;
  // Settle pending captures first, so a position mid-trade does not read as a piece up.
  const own = quiesce(game, -Infinity, Infinity, 4);
  const s = game.turn() === "w" ? own : -own;
  return Math.round(s / 10) / 10;
}

/** A piece written as "wN", "bq", "white knight" or "N" (white) / "n" (black). */
export function parsePiece(text: string): { color: "w" | "b"; type: PieceSymbol } | null {
  const s = String(text ?? "").trim();
  const short = /^([wb])([pnbrqk])$/i.exec(s);
  if (short) return { color: short[1].toLowerCase() as "w" | "b", type: short[2].toLowerCase() as PieceSymbol };
  if (/^[PNBRQK]$/.test(s)) return { color: "w", type: s.toLowerCase() as PieceSymbol };
  if (/^[pnbrqk]$/.test(s)) return { color: "b", type: s as PieceSymbol };
  const words = /^(white|black)?\s*(pawn|knight|bishop|rook|queen|king)$/i.exec(s);
  if (!words) return null;
  const type = (Object.keys(PIECE_NAME) as PieceSymbol[]).find((t) => PIECE_NAME[t] === words[2].toLowerCase())!;
  return { color: words[1]?.toLowerCase() === "black" ? "b" : "w", type };
}
