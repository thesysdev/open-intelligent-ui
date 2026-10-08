import librarySpec from "@/generated/spec.json";
import { promptOptions } from "@/lib/prompt-options";
import { sfRecordingContext, SF_RECORDING_PROMPT } from "@/lib/recording-context";
import { generateSystemPrompt } from "@openuidev/lang-core";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod/v4";

export const maxDuration = 120;
const messageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(80_000) });
const requestSchema = z.object({ messages: z.array(messageSchema).min(1).max(40) });
const efforts = ["none", "minimal", "low", "medium", "high"] as const;

export async function POST(req: Request) {
  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
      return Response.json({ error: "Send a conversation ending with a user message." }, { status: 400 });
    }
    const capture = new URL(req.url).searchParams.get("capture") === "sf";
    if (capture && process.env.ENABLE_RECORDING_PRESET !== "1") {
      return Response.json({ error: "The optional recording preset is disabled." }, { status: 403 });
    }
    if (capture && parsed.data.messages.at(-1)?.content.trim() !== SF_RECORDING_PROMPT) {
      return Response.json({ error: "This recording preset is only for the reference sightseeing prompt. Use normal chat for other requests." }, { status: 400 });
    }
    const configuredEffort = process.env.REASONING_EFFORT;
    const reasoning_effort = efforts.find((value) => value === configuredEffort);
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: generateSystemPrompt({ library: librarySpec, promptOptions }) + (capture ? `\n\n${sfRecordingContext}` : "") },
      ...parsed.data.messages,
    ];
    // Always a real upstream request. No fixture response, replay, delay or buffering.
    const stream = await new OpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.2",
      messages,
      ...(reasoning_effort ? { reasoning_effort } : {}),
      stream: true,
    }, { signal: req.signal });
    return new Response(stream.toReadableStream(), {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
        "X-OpenUI-Mode": capture ? "reference-context-live-model" : "generative",
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid request body." }, { status: 400 });
    // Avoid exposing provider credentials or internal request metadata to the browser.
    console.error("Chat request failed:", error instanceof OpenAI.APIError ? error.status : "request error");
    return Response.json({ error: "The response could not be generated. Please try again." }, { status: 502 });
  }
}
