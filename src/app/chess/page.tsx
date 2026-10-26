"use client";
import "@/lib/devtools";
import "@openuidev/react-ui/styles/index.css";

import { AgentInterface, fetchLLM, openAIConversationMessageFormat, openAIResponsesAdapter, useThemeModePreference } from "@openuidev/react-ui";
import type { ActionEvent } from "@openuidev/react-lang";
import { useEffect } from "react";
import { BookOpen, Bot, Crown, Puzzle, Swords, Target } from "lucide-react";
import { runLibraryAction } from "@/lib/actions";
import { withBase } from "@/lib/base-path";
import { localChatStorage, SaveMessages } from "@/lib/chat-storage";
import { chessLibrary } from "@/lib/chess/library";
import { webUrl } from "@/lib/components/style";

// Same URL guard as the main chat: only http(s) opens, in a new tab without an opener.
if (typeof window !== "undefined") {
  const open = window.open.bind(window);
  window.open = (url?: string | URL) => {
    const safe = webUrl(String(url ?? ""));
    return safe ? open(safe, "_blank", "noopener,noreferrer") : null;
  };
}

const starters = [
  { displayText: "Learn the Italian", prompt: "Teach me the Italian Game as White, move by move", icon: <BookOpen size={16} /> },
  { displayText: "Play the engine", prompt: "Let me play a game as Black against the computer", icon: <Bot size={16} /> },
  { displayText: "Give me a puzzle", prompt: "Give me a mate-in-2 puzzle", icon: <Puzzle size={16} /> },
  { displayText: "Beat 1.e4 as Black", prompt: "What should I play as Black against 1.e4? I'm a beginner", icon: <Swords size={16} /> },
  { displayText: "Opening traps", prompt: "Show me a trap I can set in the Ruy Lopez", icon: <Target size={16} /> },
  { displayText: "Replay a classic", prompt: "Walk me through the Opera Game, Morphy vs the Duke and Count, 1858", icon: <Crown size={16} /> },
];

const llm = fetchLLM({
  url: withBase("/api/chess"),
  streamAdapter: openAIResponsesAdapter(),
  messageFormat: openAIConversationMessageFormat,
});

const storage = typeof window === "undefined" ? undefined : localChatStorage("chess");

function onAction(event: ActionEvent) {
  void runLibraryAction(event);
}

export default function ChessCoach() {
  const { setPreference, mode } = useThemeModePreference();
  useEffect(() => {
    document.documentElement.setAttribute("data-openui-theme", mode);
  }, [mode]);

  return (
    <div className="chat-shell">
      <AgentInterface
        llm={llm}
        storage={storage}
        componentLibrary={chessLibrary}
        onAction={onAction}
        agentName="Chess Coach"
        logoUrl={withBase("/shiro-face.svg")}
        theme={{ mode }}
        starters={starters}
      >
        <AgentInterface.SidebarFooter>
          <AgentInterface.ThemeModeToggle mode={mode} onModeChange={setPreference} />
        </AgentInterface.SidebarFooter>
        <AgentInterface.ThreadHeader showChatTitle={false} />
        <AgentInterface.Welcome
          image={<img src={withBase("/shiro-woodworker.svg")} alt="" className="welcome-mascot" />}
          title="What shall we work on today?"
          starterVariant="card"
          glowAnimation
        />
        <SaveMessages prefix="chess" />
      </AgentInterface>
    </div>
  );
}
