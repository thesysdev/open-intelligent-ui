import librarySpec from "@/generated/spec.json";
import { promptOptions } from "@/lib/prompt-options";
import { sfRecordingContext, sfFollowupContext, isRecordingConversation, recordingMessageText } from "@/lib/recording-context";
import { generateSystemPrompt } from "@openuidev/lang-core";
import OpenAI from "openai";
import type { Tool } from "openai/resources/responses/responses";
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
    if (capture && !isRecordingConversation(parsed.data.messages)) {
      return Response.json({ error: "This recording preset is only for the reference sightseeing prompt and its follow-ups. Use normal chat for other requests." }, { status: 400 });
    }
    const configuredEffort = process.env.REASONING_EFFORT;
    const reasoning_effort = efforts.find((value) => value === configuredEffort);
    if (!capture) {
      // Preserve main's Gateway image search and library validation for regular chat.
      const client = new OpenAI({
        apiKey: process.env.THESYS_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: "https://api.thesys.dev/v1/embed",
      });
      const stream = await client.responses.create({
        model: process.env.THESYS_MODEL || process.env.OPENAI_MODEL || "openai/gpt-5.5",
        instructions: generateSystemPrompt({ cloud: true, library: librarySpec, promptOptions }),
        input: parsed.data.messages,
        tools: [{ type: "image_search" } as unknown as Tool],
        store: false,
        ...(reasoning_effort ? { reasoning: { effort: reasoning_effort } } : {}),
        stream: true,
      }, { signal: req.signal });
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const event of stream) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            if (!req.signal.aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "The response was interrupted. Please try again." })}\n\n`));
          } finally { controller.close(); }
        },
      });
      return new Response(body, { headers: {
        "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no", "X-OpenUI-Mode": "gateway-generative",
      } });
    }
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: generateSystemPrompt({ library: librarySpec, promptOptions }) + (capture ? `\n\n${sfRecordingContext}${parsed.data.messages.length > 1 ? `\n\n${sfFollowupContext}` : ""}` : "") },
      ...parsed.data.messages.map((message) => message.role === "user" ? { ...message, content: recordingMessageText(message.content) } : message),
    ];
    // Always a real upstream request. No fixture response, replay, delay or buffering.
    const stream = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.THESYS_API_KEY, baseURL: process.env.OPENAI_BASE_URL || "https://api.thesys.dev/v1/embed" }).chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "openai/gpt-5.2",
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
