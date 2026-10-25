import { defineFunction } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { bestMove, lineProgress, positionInfo, replay, score } from "./position";

/**
 * Position lookups the chess page computes with, so a game held in a
 * $variable recomputes its status, material and hints on every move without
 * another message to the model. Every one takes the moves (SAN) and an
 * optional start fen.
 */

const game = { moves: z.array(z.string()), fen: z.string().optional() };

export const Fen = defineFunction({
  name: "Fen",
  description: "The FEN after moves from fen (or the start); null if a move is not legal",
  params: z.object(game),
  returns: z.string(),
  fn: ({ moves, fen }) => {
    const r = replay(moves, fen);
    if (r.bad) throw new Error(`illegal move: ${r.bad}`);
    return r.game.fen();
  },
});

export const Position = defineFunction({
  name: "Position",
  description:
    "Facts after moves: {fen, moves (SAN), ply, moveNumber, turn (white, black), lastMove, inCheck, checkmate, stalemate, draw, gameOver, result (1-0, 0-1, 1/2-1/2 or null), status (plain words), legalMoves (count), material {white, black, diff, capturedByWhite, capturedByBlack}, illegal}",
  params: z.object(game),
  returns: z.any(),
  fn: ({ moves, fen }) => positionInfo(moves, fen),
});

export const LegalMoves = defineFunction({
  name: "LegalMoves",
  description: "The legal moves (SAN) for the side to move after moves, optionally only those of the piece on square",
  params: z.object({ ...game, square: z.string().optional() }),
  returns: z.array(z.string()),
  fn: ({ moves, fen, square }) => {
    const g = replay(moves, fen).game;
    const sq = square?.trim().toLowerCase();
    return /^[a-h][1-8]$/.test(sq ?? "") ? g.moves({ square: sq as never }) : g.moves();
  },
});

export const PlayMove = defineFunction({
  name: "PlayMove",
  description: "Copy of moves with move added (written as SAN like \"Nf3\" or squares like \"g1f3\"); unchanged if it is not legal there",
  params: z.object({ moves: z.array(z.string()), move: z.string(), fen: z.string().optional() }),
  returns: z.array(z.string()),
  fn: ({ moves, move, fen }) => {
    const r = replay([...moves, move], fen);
    return r.bad ? moves : r.san;
  },
});

export const LineProgress = defineFunction({
  name: "LineProgress",
  description:
    "How far moves follow line (a full move list from the same start): {onLine, played, total, done, next (the line's next move), expected and wrongMove (where it left the line)}",
  params: z.object({ moves: z.array(z.string()), line: z.array(z.string()), fen: z.string().optional() }),
  returns: z.any(),
  fn: ({ moves, line, fen }) => lineProgress(moves, line, fen),
});

export const BestMove = defineFunction({
  name: "BestMove",
  description: "The built-in engine's move (SAN) for the side to move after moves, from a short search; good for hints, not deep analysis. null when the game is over",
  params: z.object(game),
  returns: z.string().nullable(),
  fn: ({ moves, fen }) => bestMove(moves, fen, 2),
});

export const Score = defineFunction({
  name: "Score",
  description: "The built-in engine's score after moves in pawns from white's side (+1.5 white is better, 99 or -99 is mate), from material and piece placement",
  params: z.object(game),
  returns: z.number(),
  fn: ({ moves, fen }) => score(moves, fen),
});

export const chessFunctions = [Fen, Position, LegalMoves, PlayMove, LineProgress, BestMove, Score];
