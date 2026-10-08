"use client";
import "@openuidev/react-ui/styles/index.css";
import "leaflet/dist/leaflet.css";
import "@/lib/route/route.css";
import "@/lib/intelligent/intelligent.css";
import "@/lib/intelligent/tools.css";
import "@/lib/intelligent/creative.css";
import "@/lib/intelligent/retro.css";
import "@/lib/intelligent/roadtrip.css";
import "@/lib/intelligent/shell.css";
import { updateLocationQuery } from "@/lib/intelligent/navigation";

import {
  AgentInterface,
  fetchLLM,
  openAIMessageFormat,
  openAIReadableStreamAdapter,
} from "@openuidev/react-ui";
import { library } from "@/lib/library";
import { ExamplesGallery } from "@/lib/intelligent/gallery";
import { use, useState } from "react";
import { PrimitivesGallery } from "@/lib/intelligent/primitives";

const llm = fetchLLM({
  url: "/api/chat",
  streamAdapter: openAIReadableStreamAdapter(),
  messageFormat: openAIMessageFormat,
});

export default function Home({searchParams}: {searchParams: Promise<Record<string,string|string[]|undefined>>}) {
  const query=use(searchParams);
  const [path,setPath]=useState<string|undefined>(query.view==="chat"?undefined:query.view==="components"?"/components":"/examples");
  const navigate=(next:string|undefined)=>{setPath(next);updateLocationQuery({view:next?.slice(1)??"chat",example:null});};
  if (path === "/components") return <div className="intelligent-app"><div className="iui-primitives-page"><div className="iui-primitives-top"><div><h1>The component library</h1><p>One visual language, from simple answers to interactive experiences.</p></div><button className="iui-button" onClick={()=>navigate("/examples")}>Examples ↗</button></div><PrimitivesGallery/></div></div>;
  return (
    <div className="intelligent-app">
      <AgentInterface llm={llm} componentLibrary={library} agentName="OpenUI" path={path} onNavigate={navigate} theme={{ mode: "light", lightTheme: {defaultChartPalette:["#0285ff", "#00a67d", "#8b5cf6", "#f4a340", "#e46d91", "#4b9ca6"]} }}>
        <AgentInterface.Sidebar>
          <AgentInterface.SidebarHeader />
          <AgentInterface.SidebarContent>
            <AgentInterface.NewChatButton />
            <AgentInterface.SidebarItem path="/examples" icon={<span>◈</span>}>Examples</AgentInterface.SidebarItem>
            <AgentInterface.SidebarItem path="/components" icon={<span>▦</span>}>Components</AgentInterface.SidebarItem>
            <AgentInterface.SidebarSeparator />
            <AgentInterface.ThreadList />
          </AgentInterface.SidebarContent>
          <div className="iui-shell-footer">Open source. Built with OpenUI.</div>
        </AgentInterface.Sidebar>
        <AgentInterface.ThreadHeader><div className="iui-shell-header"><span>OpenUI</span><div><button onClick={()=>navigate("/examples")}>Examples</button><button onClick={()=>navigate("/components")}>Components</button></div></div></AgentInterface.ThreadHeader>
        <AgentInterface.Welcome title="What can I help you explore?" description="Ask a question. Get an answer you can interact with." starterVariant="short" starters={[
          {displayText:"Plan a day in San Francisco",prompt:"Plan a sightseeing route in San Francisco with a map, photos, and stops I can add or remove.",icon:<span>⌁</span>},
          {displayText:"Try a new room color",prompt:"Show me an interactive living room wall color preview with a calming palette.",icon:<span>◒</span>},
          {displayText:"Understand something",prompt:"Explain the central limit theorem with an interactive simulation.",icon:<span>◈</span>},
          {displayText:"Make a dinner plan",prompt:"Help me plan a Sunday roast for 6 friends with an adjustable shopping list and cooking checklist.",icon:<span>♧</span>},
        ]}/>
        <AgentInterface.Route path="/examples"><ExamplesGallery initialExample={typeof query.example==="string"?query.example:"bicycle"} onChat={()=>navigate(undefined)} onComponents={()=>navigate("/components")}/></AgentInterface.Route>
      </AgentInterface>
    </div>
  );
}
