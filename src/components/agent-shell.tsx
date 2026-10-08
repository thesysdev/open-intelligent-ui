"use client";

import "@openuidev/react-ui/styles/index.css";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/route/route.css";
import "./agent-shell.css";
import {
  AgentInterface,
  fetchLLM,
  openAIMessageFormat,
  openAIReadableStreamAdapter,
  useThread,
  useThreadList,
} from "@openuidev/react-ui";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CaptureWalkthrough } from "./capture-walkthrough";
import { library } from "@/lib/library";

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

function ShellNavigation({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const newThread = useThreadList((state) => state.switchToNewThread);
  return (
    <div className="sf-navigation">
      <div className="sf-navigation-brand">
        {/* Brand assets and shell proportions adapted from openui PR #1327. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={expanded ? "/brand-wordmark-text.svg" : "/brand-logo.svg"} alt="OpenUI" />
        {expanded && <button className="sf-icon-button" onClick={onToggle} aria-label="Collapse sidebar"><Icon><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></Icon></button>}
      </div>
      {!expanded && <button className="sf-icon-button" onClick={onToggle} aria-label="Open chat history" title="Chat history"><Icon><path d="M3 11a9 9 0 1 1 2.7 7M3 5v6h6M12 7v5l3 2" /></Icon></button>}
      <button className="sf-new-chat" onClick={() => newThread()} aria-label="New chat" title="New chat"><Icon><path d="M13 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-7M16 3l5 5M10 14l2-6 6-6 4 4-6 6-6 2Z" /></Icon>{expanded && <span>New chat</span>}</button>
      {expanded && <div className="sf-history"><span className="sf-history-heading">Your chats</span><AgentInterface.ThreadList /></div>}
    </div>
  );
}

function ShellHeader({ onOpenHistory }: { onOpenHistory: () => void }) {
  const newThread = useThreadList((state) => state.switchToNewThread);
  return <div className="sf-chat-header"><div className="sf-chat-heading"><button className="sf-icon-button sf-mobile-menu" onClick={onOpenHistory} aria-label="Open chat history"><Icon><path d="M4 7h16M4 12h16M4 17h16" /></Icon></button><span>OpenUI</span></div><button className="sf-header-new" onClick={() => newThread()}><Icon><path d="M12 5v14M5 12h14" /></Icon>New chat</button></div>;
}

function GenerationTiming() {
  const running = useThread((state) => state.isRunning);
  const messages = useThread((state) => state.messages);
  useEffect(() => {
    if (running) return;
    const shell = document.querySelector<HTMLElement>("[data-agent-shell]");
    if (!shell) return;
    let frame = 0;
    const check = () => {
      if (shell.dataset.streamState !== "complete" || shell.dataset.renderElapsedMs) return;
      const replies = shell.querySelectorAll<HTMLElement>(".openui-shell-thread-message-assistant");
      const latest = replies[replies.length - 1];
      if (!latest) return;
      const maps = Array.from(latest.querySelectorAll<HTMLElement>(".tv-map-wrap"));
      const images = Array.from(latest.querySelectorAll<HTMLImageElement>(".tv-photo img"));
      if (maps.some((map) => map.dataset.revealState !== "ready") || images.some((image) => !image.complete)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const done = performance.now();
        const elapsed = done - Number(shell.dataset.streamStartedMs);
        if (!Number.isFinite(elapsed) || elapsed <= 0 || shell.dataset.renderElapsedMs) return;
        Object.assign(shell.dataset, { renderDoneMs: String(done), renderElapsedMs: String(elapsed) });
        latest.dataset.generationLabel = `Rendered in ${(elapsed / 1000).toFixed(1)} s`;
      });
    };
    const observer = new MutationObserver(check);
    observer.observe(shell, { subtree: true, attributes: true, childList: true });
    shell.addEventListener("load", check, true);
    shell.addEventListener("error", check, true);
    check();
    return () => { observer.disconnect(); shell.removeEventListener("load", check, true); shell.removeEventListener("error", check, true); cancelAnimationFrame(frame); };
  }, [running, messages]);
  return null;
}

/** Observe real network bytes without buffering, replaying, or changing the stream. */
const measuredFetch: typeof fetch = async (input, init) => {
  const shell = document.querySelector<HTMLElement>("[data-agent-shell]");
  const started = performance.now();
  const requestId = crypto.randomUUID();
  const record = (values: Record<string, string>) => {
    if (shell && (shell.dataset.requestId === requestId || !shell.dataset.requestId)) Object.assign(shell.dataset, values);
  };
  if (shell) Object.assign(shell.dataset, { requestId, streamState: "requesting", streamStartedMs: String(started), streamFirstChunkMs: "", streamDoneMs: "", streamElapsedMs: "", renderDoneMs: "", renderElapsedMs: "" });
  init?.signal?.addEventListener("abort", () => {
    if (shell?.dataset.streamState !== "complete") record({ streamState: "cancelled", streamDoneMs: String(performance.now()) });
  }, { once: true });
  try {
    const response = await fetch(input, init);
    if (!response.ok || !response.body) {
      record({ streamState: "error", streamDoneMs: String(performance.now()) });
      return response;
    }
    let first = true;
    const measured = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (first) {
          first = false;
          record({ streamState: "streaming", streamFirstChunkMs: String(performance.now()) });
        }
        controller.enqueue(chunk);
      },
      flush() {
        const done = performance.now();
        record({ streamState: "complete", streamDoneMs: String(done), streamElapsedMs: String(done - started) });
      },
    }));
    return new Response(measured, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) {
    record({ streamState: init?.signal?.aborted ? "cancelled" : "error", streamDoneMs: String(performance.now()) });
    throw error;
  }
};

export function AgentShell({ capture = false }: { capture?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const llm = useMemo(() => fetchLLM({
    url: capture ? "/api/chat?capture=sf" : "/api/chat",
    streamAdapter: openAIReadableStreamAdapter(),
    messageFormat: openAIMessageFormat,
    fetch: measuredFetch,
  }), [capture]);

  return <main className={`intelligent-app sf-shell${capture ? " sf-shell--capture" : ""}${expanded ? " sf-shell--expanded" : ""}`} data-agent-shell data-capture={capture ? "sf" : undefined} data-stream-state="idle">
    <AgentInterface llm={llm} componentLibrary={library} agentName="OpenUI" theme={{ mode: "light" }}>
      {capture && <CaptureWalkthrough />}
      <AgentInterface.Sidebar><ShellNavigation expanded={expanded} onToggle={() => setExpanded((value) => !value)} /></AgentInterface.Sidebar>
      <AgentInterface.ThreadHeader><GenerationTiming /><ShellHeader onOpenHistory={() => setExpanded((value) => !value)} /></AgentInterface.ThreadHeader>
      <AgentInterface.MobileHeader><span>OpenUI</span></AgentInterface.MobileHeader>
      <AgentInterface.Welcome title="Where would you like to go?" starters={[{ displayText: "A day in San Francisco", prompt: "I'm in San Francisco for a day, plan a sightseeing route for me" }, { displayText: "An afternoon in Paris", prompt: "I'm in Paris for an afternoon. Plan a walk with a few memorable stops." }]} starterVariant="short" />
      <AgentInterface.Composer placeholder="Ask OpenUI" />
    </AgentInterface>
  </main>;
}
