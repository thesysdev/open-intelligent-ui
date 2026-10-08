"use client";
import "@openuidev/react-ui/styles/index.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/route/route.css";

import {
  AgentInterface,
  fetchLLM,
  openAIMessageFormat,
  openAIReadableStreamAdapter,
} from "@openuidev/react-ui";
import { library } from "@/lib/library";

const llm = fetchLLM({
  url: "/api/chat",
  streamAdapter: openAIReadableStreamAdapter(),
  messageFormat: openAIMessageFormat,
});

export default function Home() {
  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <AgentInterface llm={llm} componentLibrary={library} agentName="OpenUI" theme={{ mode: "light" }} />
    </div>
  );
}
