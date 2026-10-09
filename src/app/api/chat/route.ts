import librarySpec from "@/generated/spec.json";
import { localPromptOptions, promptOptions } from "@/lib/prompt-options";
import { generateSystemPrompt } from "@openuidev/lang-core";
import OpenAI from "openai";
import type { ReasoningEffort } from "openai/resources/shared";
import type { ResponseInputItem, Tool } from "openai/resources/responses/responses";

// Both backends speak the Responses protocol, so the stock OpenAI SDK works
// against either and the browser stream is the same.
//
// OpenUI Gateway (default): cloud: true lets Gateway build the prompt from this
// library spec and validate/correct the OpenUI Lang it streams back. Gateway
// also runs image search itself; the model puts the image URLs into the
// components (image_search is a Gateway extension to the SDK's tool union).
//
// Ollama (MODEL_PROVIDER=ollama, or OLLAMA_MODEL set): a local model. The full
// OpenUI prompt is built here, there is no image search (photos come from
// Wikipedia), and the output is not corrected, so results depend on the model.
const useOllama = process.env.MODEL_PROVIDER === "ollama" || !!process.env.OLLAMA_MODEL;
const backend = useOllama
  ? {
      name: "Ollama",
      model: process.env.OLLAMA_MODEL ?? "qwen3.8:27b",
      instructions: generateSystemPrompt({ library: librarySpec, promptOptions: localPromptOptions }),
      tools: [] as Tool[],
      connect: () => new OpenAI({ apiKey: "ollama", baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1" }),
      missingConfig: undefined,
    }
  : {
      name: "OpenUI Gateway",
      model: process.env.THESYS_MODEL ?? "openai/gpt-5.5",
      instructions: generateSystemPrompt({ cloud: true, library: librarySpec, promptOptions }),
      tools: [{ type: "image_search" } as unknown as Tool],
      connect: () => new OpenAI({ apiKey: process.env.THESYS_API_KEY, baseURL: "https://api.thesys.dev/v1/embed" }),
      missingConfig: process.env.THESYS_API_KEY ? undefined : "THESYS_API_KEY is not set. Add it to .env.local, or set MODEL_PROVIDER=ollama to use a local model.",
    };

// Created on first request so the app builds without any keys set.
let client: OpenAI | undefined;

const MAX_ITEMS = 60;
const MAX_BODY_BYTES = 1_000_000;

// AgentInterface saves component state (the user's map edits) at the end of the
// answer as "]]>openui:context\n[{...}]". Rewrite it as a sentence the model reads.
const CONTEXT_MARKER = "]]>openui:context";
function describeRouteEdits(content: string): string {
  const at = content.indexOf(CONTEXT_MARKER);
  if (at < 0) return content;
  let state: Record<string, { value?: unknown }> = {};
  try { state = (JSON.parse(content.slice(at + CONTEXT_MARKER.length).trim()) as typeof state[])[0] ?? {}; } catch { return content.slice(0, at); }
  const removed = Array.isArray(state.routeRemoved?.value) ? state.routeRemoved.value : [];
  const added = Array.isArray(state.routeAdded?.value) ? state.routeAdded.value.map((stop: { name?: string; id?: string }) => stop?.name || stop?.id).filter(Boolean) : [];
  const edits = [removed.length && `removed stops (by id): ${removed.join(", ")}`, added.length && `added stops: ${added.join(", ")}`].filter(Boolean);
  return content.slice(0, at) + (edits.length ? `\n\n(User's edits to this route: ${edits.join("; ")}.)` : "");
}

// The browser sends the whole conversation each turn. Keep only user and
// assistant text: earlier tool calls already ran on the backend, and
// trusted instructions never come from the browser.
function toInput(messages: unknown): ResponseInputItem[] | null {
  if (!Array.isArray(messages)) return null;
  const items = messages.flatMap((item): ResponseInputItem[] => {
    if (!item || typeof item !== "object") return [];
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return [];
    if (typeof content !== "string" && !Array.isArray(content)) return [];
    return [{ role, content: role === "assistant" && typeof content === "string" ? describeRouteEdits(content) : content } as ResponseInputItem];
  });
  return items.length ? items.slice(-MAX_ITEMS) : null;
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

  let stream: AsyncIterable<unknown>;
  try {
    client ??= backend.connect();
    stream = await client.responses.create(
      {
        model: backend.model,
        instructions: backend.instructions,
        input,
        ...(backend.tools.length ? { tools: backend.tools } : {}),
        store: false,
        ...(process.env.REASONING_EFFORT ? { reasoning: { effort: process.env.REASONING_EFFORT as ReasoningEffort } } : {}),
        stream: true,
      },
      { signal: req.signal }, // propagate browser aborts
    );
  } catch (err) {
    // Surface upstream failures (bad key, unknown model, Ollama not running) as an HTTP error.
    const e = err as { status?: number; message?: string };
    console.error(err);
    return Response.json({ error: { message: `${backend.name}: ${e.message ?? "upstream error"}` } }, { status: e.status ?? 502 });
  }

  // Relay the Responses events as SSE; the client parses them with openAIResponsesAdapter().
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
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
