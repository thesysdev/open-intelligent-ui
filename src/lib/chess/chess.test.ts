import { createParser, type LibrarySpec } from "@openuidev/lang-core";
import { describe, expect, it } from "vitest";
import spec from "@/generated/chess-spec.json";
import { LineProgress, PlayMove } from "./functions";
import { boardProps, strings } from "./components";
import { bestMove, lineProgress, positionInfo, replay, score } from "./position";
import { exampleOpening, examplePuzzle, exampleSparring } from "./prompt-options";

describe("chess positions", () => {
  it("replays loose move text as SAN and stops at an illegal move", () => {
    const r = replay(["e2e4", "e5", "nf3", "Nc6", "Bb5", "Qh4x"]);
    expect(r.san).toEqual(["e4", "e5", "Nf3", "Nc6", "Bb5"]);
    expect(r.bad).toBe("Qh4x");
  });

  it("knows a checkmate and the material", () => {
    const p = positionInfo(["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"]);
    expect(p.checkmate).toBe(true);
    expect(p.result).toBe("1-0");
    expect(p.status).toBe("Checkmate, white wins");
    expect(p.material.diff).toBe(1);
    expect(p.material.capturedByWhite).toEqual(["pawn"]);
  });

  it("follows a line and spots where it left", () => {
    const line = ["e4", "e5", "Nf3", "Nc6", "Bc4"];
    expect(lineProgress(["e4", "e5"], line)).toMatchObject({ onLine: true, played: 2, next: "Nf3", done: false });
    expect(lineProgress(["e4", "e5", "Nc3"], line)).toMatchObject({ onLine: false, expected: "Nf3", wrongMove: "Nc3" });
    expect(LineProgress.fn({ moves: line, line })).toMatchObject({ done: true });
  });

  it("adds only legal moves", () => {
    expect(PlayMove.fn({ moves: ["e4"], move: "e7e5" })).toEqual(["e4", "e5"]);
    expect(PlayMove.fn({ moves: ["e4"], move: "Ke2" })).toEqual(["e4"]);
  });

  it("finds a mate in one and a back-rank mate in two", () => {
    expect(bestMove(["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"])).toBe("Qxf7#");
    const fen = "r5k1/5ppp/8/8/8/8/1Q3PPP/1R4K1 w - - 0 1";
    expect(bestMove([], fen)).toBe("Qb8+");
    expect(positionInfo(["Qb8+", "Rxb8", "Rxb8#"], fen).checkmate).toBe(true);
  });

  it("does not count a pending recapture as material won", () => {
    // After 1.e4 d5 2.exd5 the queen takes back, so the score stays near level.
    expect(Math.abs(score(["e4", "d5", "exd5"]))).toBeLessThan(1);
  });
});

const parser = createParser((spec as LibrarySpec).schema!, (spec as LibrarySpec).root);

describe.each([
  { id: "opening", code: exampleOpening },
  { id: "sparring", code: exampleSparring },
  { id: "puzzle", code: examplePuzzle },
])("chess example $id", ({ code }) => {
  it("parses with the 1.0 parser without errors", () => {
    const result = parser.parse(code);
    expect(result.root).not.toBeNull();
    expect(result.meta.errors.map((e) => e.message)).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
    expect(result.meta.orphaned).toEqual([]);
  });
});

describe("chess board props from a model", () => {
  it("turns any arrow or move shape into a list of strings", () => {
    expect(strings("e2e4")).toEqual(["e2e4"]);
    expect(strings("e2e4, d2d4")).toEqual(["e2e4", "d2d4"]);
    expect(strings([["Nf3"], "e4"])).toEqual(["Nf3", "e4"]);
    expect(strings({ from: "g1", to: "f3" })).toEqual(["g1f3"]);
    expect(strings([{ from: "g1", to: "f3" }, 3, null])).toEqual(["g1f3"]);
    expect(strings(42)).toEqual([]);
    expect(strings(undefined)).toEqual([]);
  });

  it("falls back on unknown options", () => {
    const p = boardProps({ mode: "play", side: "w", level: 5, fen: {}, arrows: "e2e4", highlights: null });
    expect(p).toMatchObject({ mode: "view", side: "white", level: "medium", fen: undefined, arrows: ["e2e4"], highlights: [], line: null });
  });

  it("reads moves with numbers and annotations", () => {
    expect(replay(strings("1.e4 e5 2.Nf3!? Nc6")).san).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });
});
