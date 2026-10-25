import spec from "@/generated/spec.json";
import { createChatHandler } from "@/lib/chat-handler";
import { promptOptions } from "@/lib/prompt-options";
import type { LibrarySpec } from "@openuidev/lang-core";

// Answers stream for up to about a minute; say so, in case the project is not on Fluid compute.
export const maxDuration = 300;

export const POST = createChatHandler(spec as LibrarySpec, promptOptions);
