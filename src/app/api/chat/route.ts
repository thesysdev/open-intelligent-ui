import spec from "@/generated/spec.json";
import { promptOptions } from "@/lib/prompt-options";
import { generateSystemPrompt, type LibrarySpec } from "@openuidev/lang-core";
import OpenAI from "openai";
import type { ReasoningEffort } from "openai/resources/shared";
import type { ChatCompletionChunk, ChatCompletionCreateParamsStreaming, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ResponseInputItem } from "openai/resources/responses/responses";

// Two ways to reach a model, chosen by environment variables:
//
// OpenUI Cloud (default, THESYS_API_KEY): the Responses API on OpenUI Gateway.
// cloud: true sends this library's spec, so Gateway builds the prompt and
// validates and corrects the OpenUI Lang it streams back.
//
// Direct (LLM_BASE_URL, or the Ollama shortcuts): any OpenAI-compatible Chat
// Completions endpoint, such as OpenRouter, Ollama or LM Studio. The full
// OpenUI 1.0 prompt is built here from the same spec and prompt options, and
// the model's text is relayed as Responses events, so the browser stream is
// the same for both. The output is not corrected.
//
// Neither gets an image search tool: SearchImage finds its own photo for its query.

const librarySpec: LibrarySpec = spec;

// Low effort answers about five times sooner with the same quality of UI;
// LLM_REASONING_EFFORT=default sends no effort at all (the model's own default).
const effortSetting = process.env.LLM_REASONING_EFFORT ?? "low";
const effort = effortSetting === "default" || effortSetting === "" ? undefined : (effortSetting as ReasoningEffort);

const useOllama = process.env.MODEL_PROVIDER === "ollama" || !!process.env.OLLAMA_MODEL;
const direct = process.env.LLM_BASE_URL
  ? { name: "LLM", baseURL: process.env.LLM_BASE_URL, apiKey: process.env.LLM_API_KEY, model: process.env.LLM_MODEL }
  : useOllama
    ? { name: "Ollama", baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1", apiKey: "ollama", model: process.env.OLLAMA_MODEL ?? "qwen3.8:27b" }
    : null;

const backend = direct
  ? {
      kind: "direct" as const,
      name: direct.name,
      model: direct.model ?? "",
      instructions: generateSystemPrompt({ library: librarySpec, promptOptions }),
      connect: () => new OpenAI({ apiKey: direct.apiKey ?? "none", baseURL: direct.baseURL }),
      missingConfig: direct.model ? undefined : "LLM_MODEL is not set. Set it to the model id your LLM_BASE_URL serves.",
    }
  : {
      kind: "cloud" as const,
      name: "OpenUI Gateway",
      model: process.env.THESYS_MODEL ?? "openai/gpt-6.1-sol",
      instructions: generateSystemPrompt({
        cloud: true,
        library: librarySpec,
        promptOptions: { examples: promptOptions.examples, additionalRules: promptOptions.additionalRules },
      }),
      connect: () => new OpenAI({ apiKey: process.env.THESYS_API_KEY, baseURL: process.env.THESYS_BASE_URL ?? "https://api.thesys.dev/v1/embed" }),
      missingConfig: process.env.THESYS_API_KEY
        ? undefined
        : "THESYS_API_KEY is not set. Add it to .env, or set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL to use any OpenAI-compatible API.",
    };

// Created on first request so the app builds without any keys set.
let client: OpenAI | undefined;

const MAX_ITEMS = 60;
const MAX_BODY_BYTES = 1_000_000;

// The browser sends the whole conversation each turn. Keep only user and
// assistant text: earlier tool calls already ran on the backend, and
// trusted instructions never come from the browser.
function toInput(messages: unknown): ResponseInputItem[] | null {
  if (!Array.isArray(messages)) return null;
  const items = messages.flatMap((item): ResponseInputItem[] => {
    if (!item || typeof item !== "object") return [];
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return [];
    if (typeof content === "string") return [{ role, content } as ResponseInputItem];
    if (!Array.isArray(content) || !content.length || !content.every((part) =>
      part && typeof part === "object" && typeof part.text === "string"
      && (part.type === "input_text" || part.type === "output_text" || part.type === "text"))) return [];
    // Both providers receive the same validated text; never pass arbitrary
    // browser objects through as Responses content blocks.
    return [{ role, content: content.map((part) => part.text).join("") } as ResponseInputItem];
  });
  return items.length ? items.slice(-MAX_ITEMS) : null;
}

/** The conversation as Chat Completions messages (text only). */
function toChatMessages(input: ResponseInputItem[]): ChatCompletionMessageParam[] {
  return input.map((item) => {
    const { role, content } = item as { role: "user" | "assistant"; content: unknown };
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((p) => (p as { text?: string }).text ?? "").join("") : "";
    return { role, content: text };
  });
}

/** A Chat Completions stream as the Responses events the browser adapter reads. */
async function* asResponsesEvents(stream: AsyncIterable<ChatCompletionChunk>) {
  const id = `msg_${Date.now()}`;
  yield { type: "response.output_item.added", item: { id, type: "message", role: "assistant", content: [], status: "in_progress" }, output_index: 0 };
  let text = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) continue;
    text += delta;
    yield { type: "response.output_text.delta", item_id: id, output_index: 0, content_index: 0, delta };
  }
  yield { type: "response.output_text.done", item_id: id, output_index: 0, content_index: 0, text };
  yield { type: "response.completed" };
}

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: { message: "expected application/json" } }, { status: 415 });
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return Response.json({ error: { message: "request body too large" } }, { status: 413 });
  }
  let input: ResponseInputItem[] | null;
  try {
    input = toInput((JSON.parse(raw) as { messages?: unknown }).messages);
  } catch {
    input = null;
  }
  if (!input) return Response.json({ error: { message: "messages must be a non-empty array" } }, { status: 400 });

  if (backend.missingConfig) return Response.json({ error: { message: backend.missingConfig } }, { status: 500 });

  let events: AsyncIterable<unknown>;
  try {
    client ??= backend.connect();
    events =
      backend.kind === "cloud"
        ? await client.responses.create(
            {
              model: backend.model,
              instructions: backend.instructions,
              input,
              store: false,
              ...(effort ? { reasoning: { effort } } : {}),
              stream: true,
            },
            { signal: req.signal }, // propagate browser aborts
          )
        : asResponsesEvents(
            await client.chat.completions.create(
              {
                model: backend.model,
                messages: [{ role: "system", content: backend.instructions }, ...toChatMessages(input)],
                stream: true,
                // OpenRouter reads reasoning.effort; OpenAI-style servers read reasoning_effort.
                ...(effort ? { reasoning_effort: effort, reasoning: { effort } } : {}),
              } as ChatCompletionCreateParamsStreaming,
              { signal: req.signal },
            ),
          );
  } catch (err) {
    // Surface upstream failures (bad key, unknown model, server not running) as an HTTP error.
    const e = err as { status?: number; message?: string };
    console.error(err);
    return Response.json({ error: { message: `${backend.name}: ${e.message ?? "upstream error"}` } }, { status: e.status ?? 502 });
  }

  // Relay the Responses events as SSE; the client parses them with openAIResponsesAdapter().
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
