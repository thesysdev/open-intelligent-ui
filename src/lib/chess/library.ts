import { library } from "../library";
import "./chess.css";
import { ChessBoard, ChessPiece, EvalBar, MoveList, PositionSummary } from "./components";
import { chessFunctions } from "./functions";

/** The chat library plus a playable board and position math for the chess coach. */
export const chessLibrary = library.extend({
  components: { add: [ChessBoard, MoveList, PositionSummary, EvalBar, ChessPiece] },
  functions: { add: chessFunctions },
});

// The CLI (npm run prompt) picks up these exports by name.
export { chessPromptOptions } from "./prompt-options";
