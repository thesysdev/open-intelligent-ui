"use client";

import { Renderer, type ActionEvent, type OpenUIError } from "@openuidev/react-lang";
import { useCallback, useEffect, useState } from "react";
import { runLibraryAction } from "@/lib/actions";
import { demoTools } from "@/lib/demo-data";
import { chessLibrary } from "@/lib/chess/library";
import { coachLibrary } from "@/lib/coach/library";
import { library } from "@/lib/library";

type Bridge = { __OPENUI_PROGRAM__?: string; __OPENUI_ERRORS__?: string[]; __OPENUI_ACTIONS__?: string[] };

export function Preview({ theme, kind = "chat" }: { theme: "light" | "dark"; kind?: "chat" | "coach" | "chess" }) {
  const [program, setProgram] = useState<string | null>(null);
  useEffect(() => setProgram((window as Bridge).__OPENUI_PROGRAM__ ?? ""), []);

  // Errors and actions go on window for the script to read
  const onError = useCallback((list: OpenUIError[]) => {
    (window as Bridge).__OPENUI_ERRORS__ = list.map((e) => `${e.code}: ${e.message}`);
  }, []);
  const onAction = useCallback((event: ActionEvent) => {
    void runLibraryAction(event);
    const log = ((window as Bridge).__OPENUI_ACTIONS__ ??= []);
    log.push(`${event.type}: ${event.humanFriendlyMessage}`);
  }, []);

  return (
    <div data-theme={theme} style={{ minHeight: "100dvh", background: "var(--iui-canvas)", color: "var(--iui-ink)", fontFamily: "var(--iui-font)" }}>
      <main className="preview-root" style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px 48px", fontSize: 16, lineHeight: 1.6 }}>
        {program === null ? null : program ? (
          <Renderer response={program} library={kind === "coach" ? coachLibrary : kind === "chess" ? chessLibrary : library} isStreaming={false} onAction={onAction} onError={onError} toolProvider={demoTools} />
        ) : (
          <p>No program. Set window.__OPENUI_PROGRAM__ before the page loads.</p>
        )}
      </main>
    </div>
  );
}
