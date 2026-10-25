import spec from "@/generated/chess-spec.json";
import { createChatHandler } from "@/lib/chat-handler";
import { chessPromptOptions } from "@/lib/chess/prompt-options";
import type { LibrarySpec } from "@openuidev/lang-core";

// Answers stream for up to about a minute; say so, in case the project is not on Fluid compute.
export const maxDuration = 300;

// The chess coach: the chat library plus a playable board and position math.
export const POST = createChatHandler(spec as LibrarySpec, chessPromptOptions);
