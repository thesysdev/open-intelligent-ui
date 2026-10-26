import { createLibrary } from "@openuidev/react-lang";
import { actions } from "../actions";
import { functions } from "../functions";
import { baseComponentGroups, baseComponents } from "../library";
import "./chess.css";
import { ChessBoard, ChessPiece, EvalBar, MoveList, PositionSummary } from "./components";
import { chessFunctions } from "./functions";

/** The chat library plus a playable board and position math for the chess coach. */
export const chessLibrary = createLibrary({
  root: "Col",
  components: [...baseComponents, ChessBoard, MoveList, PositionSummary, EvalBar, ChessPiece],
  functions: [...functions, ...chessFunctions],
  actions,
  componentGroups: [
    ...baseComponentGroups,
    {
      name: "Chess coach",
      components: ["ChessBoard", "MoveList", "PositionSummary", "EvalBar", "ChessPiece"],
      notes: [
        '- A game is a list of moves in SAN ("e4", "Nf3", "O-O", "exd5", "e8=Q"), played from fen or the start position. The board, @Position and @LegalMoves check them, so never write a FEN, a board drawing or a material count yourself; compute them.',
      ],
    },
  ],
});

// The CLI (npm run prompt) picks up these exports by name.
export { chessPromptOptions } from "./prompt-options";
