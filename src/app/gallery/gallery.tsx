"use client";

import "./gallery.css";

import { Renderer, type ActionEvent, type OpenUIError } from "@openuidev/react-lang";
import { Fragment, useCallback, useState } from "react";
import { runLibraryAction } from "@/lib/actions";
import { webUrl } from "@/lib/components/style";
import { demoTools } from "@/lib/demo-data";
import { library } from "@/lib/library";
import { exampleDashboard, exampleShoppingList, exampleSteps, exampleTrip } from "@/lib/prompt-options";
import { compositionPrograms } from "./composition-programs";
import { programs, type Program } from "./programs";
import { toolPrograms } from "./tool-programs";
import { ThemeProvider } from "@openuidev/intelligent-ui-library";

// The prompt's worked examples, rendered so they are known to work
const promptExamples: Program[] = [
  { id: "example-list", title: "Prompt example: shopping list", note: "Example 1 of the working-tool prompt.", code: exampleShoppingList },
  { id: "example-trip", title: "Prompt example: a composed trip", note: "Example 2 of the prompt: composition with photos, rows and a form.", code: exampleTrip },
  { id: "example-steps", title: "Prompt example: steps with drawings", note: "Example 3 of the prompt: a drawing for each step, driven by $step.", code: exampleSteps },
  { id: "example-dashboard", title: "Prompt example: dashboard", note: "Example 4, shown when the demo data tools are in the prompt.", code: exampleDashboard },
];

const sections = [
  { title: "Composition", programs: compositionPrograms },
  { title: "Working tools", programs: [...toolPrograms, ...promptExamples] },
  { title: "Components", programs },
];

function Example({ program, onAction }: { program: Program; onAction: (event: ActionEvent) => void }) {
  const [errors, setErrors] = useState<OpenUIError[]>([]);
  const onError = useCallback((list: OpenUIError[]) => {
    setErrors(list);
    if (list.length) console.error(`[gallery:${program.id}]`, list.map((e) => e.message).join("; "));
  }, [program.id]);
  return (
    <section className="gallery-example" id={program.id} aria-labelledby={`${program.id}-title`}>
      <header>
        <h2 id={`${program.id}-title`}>{program.title}</h2>
        <p>{program.note}</p>
      </header>
      <div className="gallery-preview">
        <Renderer response={program.code} library={library} isStreaming={false} onAction={onAction} onError={onError} toolProvider={demoTools} />
      </div>
      {errors.length > 0 && (
        <ul className="gallery-errors">
          {errors.map((e, i) => <li key={i}>{e.message}</li>)}
        </ul>
      )}
      <details className="gallery-source">
        <summary>OpenUI Lang</summary>
        <pre>{program.code}</pre>
      </details>
    </section>
  );
}

export function Gallery({ theme }: { theme: "light" | "dark" }) {
  const [notice, setNotice] = useState("");
  const onAction = useCallback((event: ActionEvent) => {
    const custom = runLibraryAction(event);
    if (custom) {
      void custom.then((ok) => setNotice(ok ? "Copied to the clipboard" : "Could not copy"));
      return;
    }
    if (event.type === "open_url") {
      const url = webUrl((event.params as { url?: unknown })?.url);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    const context = (event.params as { context?: unknown })?.context;
    setNotice(`Sent to the assistant: “${event.humanFriendlyMessage}”${context ? ` with ${JSON.stringify(context)}` : ""}`);
  }, []);

  return (
    <ThemeProvider mode={theme}>
      <div className="gallery" data-theme={theme}>
        <header className="gallery-top">
          <div>
            <span className="gallery-name">OpenUI</span>
            <span className="gallery-divider" />
            <span className="gallery-sub">Component gallery</span>
          </div>
          <nav className="gallery-theme" aria-label="Theme">
            <a href="?theme=light" aria-current={theme === "light" ? "page" : undefined}>Light</a>
            <a href="?theme=dark" aria-current={theme === "dark" ? "page" : undefined}>Dark</a>
          </nav>
        </header>
        <main className="gallery-content">
          <div className="gallery-intro">
            <h1>Primitives, composed by the model</h1>
            <p>Hand-written OpenUI Lang 1.0 programs rendered by the 1.0 Renderer with this app&apos;s library. {Object.keys(library.components).length} components and {Object.keys(library.functions).length} functions.</p>
            {sections.map((section) => (
              <nav key={section.title} className="gallery-index" aria-label={section.title}>
                {section.programs.map((p) => <a key={p.id} href={`#${p.id}`}>{p.title}</a>)}
              </nav>
            ))}
          </div>
          {sections.map((section) => (
            <Fragment key={section.title}>
              <h2 className="gallery-section">{section.title}</h2>
              {section.programs.map((program) => <Example key={program.id} program={program} onAction={onAction} />)}
            </Fragment>
          ))}
        </main>
        {notice && (
          <div className="gallery-notice" role="status">
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setNotice("")}>×</button>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}
