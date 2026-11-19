"use client";

import "./learn.css";

import { Renderer, type ActionEvent, type OpenUIError } from "@openuidev/react-lang";
import { useCallback, useEffect, useState } from "react";
import { runLibraryAction } from "@/lib/actions";
import { MarkdownBlocks } from "@/lib/components/markdown";
import { webUrl } from "@/lib/components/style";
import { learnLibrary } from "@/lib/learn/library";
import { learnToolProvider } from "@/lib/learn/tools";
import { lessons, type LessonBlock, type Locale } from "./lessons";

const PROGRESS_KEY = "oiu:learn:progress";
const LANG_KEY = "oiu:learn:lang";

const UI = {
  en: { prev: "Previous", next: "Next", finish: "Finish", complete: "Complete", empty: "No lessons yet." },
  zh: { prev: "上一步", next: "下一步", finish: "完成", complete: "已完成", empty: "还没有课程。" },
} as const;

function loadProgress(): string[] {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// One editable OpenUI Lang snippet: a textarea on the left, the live render on
// the right, and any parse/evaluation errors underneath.
function Playground({ initial }: { initial: string }) {
  const [code, setCode] = useState(initial);
  const [errors, setErrors] = useState<OpenUIError[]>([]);

  const onAction = useCallback((event: ActionEvent) => {
    const custom = runLibraryAction(event);
    if (custom) {
      void custom;
      return;
    }
    if (event.type === "open_url") {
      const url = webUrl((event.params as { url?: unknown })?.url);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const onError = useCallback((list: OpenUIError[]) => setErrors(list), []);

  return (
    <div className="learn-playground">
      <textarea className="learn-code" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} aria-label="OpenUI Lang" />
      <div className="learn-preview">
        <Renderer response={code} library={learnLibrary} isStreaming={false} onAction={onAction} onError={onError} toolProvider={learnToolProvider} />
      </div>
      {errors.length > 0 && (
        <ul className="learn-errors">
          {errors.map((e, i) => (
            <li key={i}>
              {e.code ? `${e.code}: ` : ""}
              {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Block({ block, lessonId, index, locale }: { block: LessonBlock; lessonId: string; index: number; locale: Locale }) {
  switch (block.kind) {
    case "prose":
      return <MarkdownBlocks text={block.text[locale]} />;
    case "lang":
      return (
        <div className="learn-block">
          {block.title ? <h3 className="learn-block-title">{block.title[locale]}</h3> : null}
          <Playground key={`${lessonId}-${index}`} initial={block.code} />
        </div>
      );
    case "code":
      return (
        <div className="learn-block">
          {block.title ? <h3 className="learn-block-title">{block.title[locale]}</h3> : null}
          <pre className="learn-code-block">
            <code>{block.code}</code>
          </pre>
        </div>
      );
  }
}

export function Learn({ theme }: { theme: "light" | "dark" }) {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = loadProgress();
    setDone(saved);
    const idx = lessons.findIndex((l) => !saved.includes(l.id));
    if (idx >= 0) setCurrent(idx);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(done));
    } catch {
      // Full or blocked storage: progress is just not remembered.
    }
  }, [done]);

  // A ?lang=zh query param wins, then a saved preference, then English.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "zh" || q === "en") {
      setLocale(q);
      return;
    }
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "zh" || saved === "en") setLocale(saved);
    } catch {
      // Blocked storage: keep the default.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, locale);
    } catch {
      // Full or blocked storage: the choice just is not remembered.
    }
  }, [locale]);

  if (lessons.length === 0) return <div className="learn">{UI[locale].empty}</div>;

  const lesson = lessons[current]!;
  const isDone = done.includes(lesson.id);
  const complete = () => {
    if (!isDone) setDone((d) => [...d, lesson.id]);
  };
  const next = () => {
    complete();
    setCurrent((c) => Math.min(lessons.length - 1, c + 1));
  };
  const prev = () => setCurrent((c) => Math.max(0, c - 1));

  return (
    <div className="learn" data-theme={theme}>
      <header className="learn-top">
        <div>
          <span className="learn-name">OpenUI</span>
          <span className="learn-divider" />
          <span className="learn-sub">Learn</span>
        </div>
        <div className="learn-actions">
          <nav className="learn-lang" aria-label="Language">
            <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
              EN
            </button>
            <button type="button" aria-pressed={locale === "zh"} onClick={() => setLocale("zh")}>
              中文
            </button>
          </nav>
          <nav className="learn-theme" aria-label="Theme">
            <a href="?theme=light" aria-current={theme === "light" ? "page" : undefined}>
              Light
            </a>
            <a href="?theme=dark" aria-current={theme === "dark" ? "page" : undefined}>
              Dark
            </a>
          </nav>
        </div>
      </header>

      <div className="learn-body">
        <nav className="learn-nav" aria-label="Lessons">
          {lessons.map((l, i) => (
            <button key={l.id} type="button" className={`learn-nav-item ${i === current ? "is-current" : ""} ${done.includes(l.id) ? "is-done" : ""}`} onClick={() => setCurrent(i)}>
              <span className="learn-nav-part">{l.part}</span>
              <span className="learn-nav-title">{l.title[locale]}</span>
              {done.includes(l.id) && <span className="learn-nav-check">✓</span>}
            </button>
          ))}
        </nav>

        <main className="learn-content">
          <h1 className="learn-title">{lesson.title[locale]}</h1>
          {lesson.blocks.map((block, i) => (
            <Block key={i} block={block} lessonId={lesson.id} index={i} locale={locale} />
          ))}
          <footer className="learn-foot">
            <button type="button" className="learn-btn" onClick={prev} disabled={current === 0}>
              {UI[locale].prev}
            </button>
            {current < lessons.length - 1 ? (
              <button type="button" className="learn-btn is-primary" onClick={next}>
                {UI[locale].next}
              </button>
            ) : (
              <button type="button" className="learn-btn is-primary" onClick={complete} disabled={isDone}>
                {isDone ? UI[locale].complete : UI[locale].finish}
              </button>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}
