import librarySpec from "@/generated/spec.json";
import { promptOptions } from "@/lib/prompt-options";
import { generateSystemPrompt } from "@openuidev/lang-core";
import OpenAI from "openai";
import type { ReasoningEffort } from "openai/resources/shared";
import type { ResponseInputItem, Tool } from "openai/resources/responses/responses";

// OpenUI Gateway speaks the Responses protocol, so the stock OpenAI SDK works
// against it. The key stays on the server.
const client = new OpenAI({
  apiKey: process.env.THESYS_API_KEY,
  baseURL: "https://api.thesys.dev/v1/embed",
});

// cloud: true lets Gateway build the prompt from this library spec and
// validate/correct the OpenUI Lang it streams back.
const instructions = generateSystemPrompt({ cloud: true, library: librarySpec, promptOptions });

// Gateway runs image search itself; the model gets the results and puts the
// image URLs into the components. It's a Gateway extension to the SDK's tool union.
const tools = [{ type: "image_search" } as unknown as Tool];

const MAX_ITEMS = 60;
const MAX_BODY_BYTES = 1_000_000;

// The browser sends the whole conversation each turn. Keep only user and
// assistant text: earlier image-search calls already ran inside Gateway, and
// trusted instructions never come from the browser.
function toInput(messages: unknown): ResponseInputItem[] | null {
  if (!Array.isArray(messages)) return null;
  const items = messages.flatMap((item): ResponseInputItem[] => {
    if (!item || typeof item !== "object") return [];
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return [];
    if (typeof content !== "string" && !Array.isArray(content)) return [];
    return [{ role, content } as ResponseInputItem];
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

  let stream: AsyncIterable<unknown>;
  try {
    stream = await client.responses.create(
      {
        model: process.env.THESYS_MODEL ?? "openai/gpt-5.5",
        instructions,
        input,
        tools,
        store: false,
        ...(process.env.REASONING_EFFORT ? { reasoning: { effort: process.env.REASONING_EFFORT as ReasoningEffort } } : {}),
        stream: true,
      },
      { signal: req.signal }, // propagate browser aborts
    );
  } catch (err) {
    // Surface upstream failures (bad key, unknown model) as an HTTP error.
    const e = err as { status?: number; message?: string };
    console.error(err);
    return Response.json({ error: { message: e.message ?? "upstream error" } }, { status: e.status ?? 502 });
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
