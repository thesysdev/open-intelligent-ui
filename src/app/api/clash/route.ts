import spec from "@/generated/coach-spec.json";
import { createChatHandler } from "@/lib/chat-handler";
import { coachPromptOptions } from "@/lib/coach/prompt-options";
import type { LibrarySpec } from "@openuidev/lang-core";

// Answers stream for up to about a minute; say so, in case the project is not on Fluid compute.
export const maxDuration = 300;

// The Clash Royale coach: the chat library plus card tiles and deck math.
export const POST = createChatHandler(spec as LibrarySpec, coachPromptOptions);
