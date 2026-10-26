"use client";
import "@/lib/devtools";
import "@openuidev/react-ui/styles/index.css";

import { AgentInterface, fetchLLM, openAIConversationMessageFormat, openAIResponsesAdapter, useThemeModePreference } from "@openuidev/react-ui";
import type { ActionEvent } from "@openuidev/react-lang";
import { useEffect } from "react";
import { Castle, Coins, Crown, Shield, Swords, Zap } from "lucide-react";
import { runLibraryAction } from "@/lib/actions";
import { withBase } from "@/lib/base-path";
import { localChatStorage, SaveMessages } from "@/lib/chat-storage";
import { coachLibrary } from "@/lib/coach/library";
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
  { displayText: "Counter Hog Rider", prompt: "Build me a deck that counters Hog Rider", icon: <Shield size={16} /> },
  { displayText: "Fix my deck", prompt: "Rate my deck and suggest swaps: Golem, Night Witch, Baby Dragon, Lumberjack, Tornado, Lightning, Barbarian Barrel, Mega Minion", icon: <Swords size={16} /> },
  { displayText: "Mega Knight vs P.E.K.K.A", prompt: "Mega Knight vs P.E.K.K.A: which should I use?", icon: <Crown size={16} /> },
  { displayText: "Why did I lose?", prompt: "I keep losing to Lava Hound and Balloon with my Hog cycle deck. What am I doing wrong?", icon: <Zap size={16} /> },
  { displayText: "Cheap cycle deck", prompt: "Make me a fast cycle deck under 3.0 average elixir", icon: <Coins size={16} /> },
  { displayText: "Beat buildings", prompt: "Build a deck that beats X-Bow and Mortar", icon: <Castle size={16} /> },
];

const llm = fetchLLM({
  url: withBase("/api/clash"),
  streamAdapter: openAIResponsesAdapter(),
  messageFormat: openAIConversationMessageFormat,
});

const storage = typeof window === "undefined" ? undefined : localChatStorage("coach");

function onAction(event: ActionEvent) {
  void runLibraryAction(event);
}

export default function Clash() {
  const { setPreference, mode } = useThemeModePreference();
  useEffect(() => {
    document.documentElement.setAttribute("data-openui-theme", mode);
  }, [mode]);

  return (
    <div className="chat-shell">
      <AgentInterface
        llm={llm}
        storage={storage}
        componentLibrary={coachLibrary}
        onAction={onAction}
        agentName="Deck Coach"
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
          title="Which deck are we fixing?"
          starterVariant="card"
          glowAnimation
        />
        <SaveMessages prefix="coach" />
      </AgentInterface>
      <p className="coach-disclaimer">Fan-made demo. Not affiliated with or endorsed by Supercell.</p>
    </div>
  );
}
