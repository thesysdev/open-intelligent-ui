"use client";

// Slim openui.com bar for the demo: a way back to the site, the GitHub stars and a
// "Get API key" call to action. Styled after the bar on openui.com/chat.

import { type MouseEvent, type ReactNode, useEffect, useState } from "react";
import styles from "./site-header.module.css";

const DEMOS_HREF = "https://www.openui.com/demos";
const GITHUB_HREF = "https://github.com/thesysdev/openui";
const API_KEYS_HREF = "https://console.thesys.dev/keys";
const STAR_FALLBACK = 10890;

function useStarCount() {
  const [count, setCount] = useState(STAR_FALLBACK);
  useEffect(() => {
    let cancelled = false;
    // Root-relative on purpose: on openui.com this is the docs app's cached endpoint.
    fetch("/api/github-stars")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stars?: unknown } | null) => {
        if (!cancelled && typeof data?.stars === "number" && data.stars > 0) setCount(data.stars);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return count;
}

// Only go back when the previous page is on this site, so the button never sends
// someone off to wherever they were before landing on the demo.
function canGoBackInSite(): boolean {
  if (window.history.length <= 1 || !document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

function onBackClick(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  if (!canGoBackInSite()) return;
  event.preventDefault();
  window.history.back();
}

function ArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg className={styles.githubMark} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function GitHubButton() {
  const count = String(useStarCount());
  return (
    <a
      href={GITHUB_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.githubButton}
      aria-label={`Star OpenUI on GitHub (${count} stars)`}
    >
      <GitHubMark />
      <span className={styles.githubCount} aria-hidden="true">
        {count}
      </span>
      <span className={styles.githubStars} aria-hidden="true">
        stars
      </span>
    </a>
  );
}

export function OpenUISiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <a className={styles.backLink} href={DEMOS_HREF} onClick={onBackClick} aria-label="Back to OpenUI demos">
          <ArrowLeft />
          <span className={styles.backLabel}>All demos</span>
        </a>
        <p className={styles.pitch}>Build your own Generative UI agent with OpenUI</p>
        <div className={styles.actions}>
          <GitHubButton />
          <a className={styles.ctaButton} href={API_KEYS_HREF} target="_blank" rel="noopener noreferrer">
            <span>Get API key</span>
            <ArrowUpRight />
          </a>
        </div>
      </div>
    </header>
  );
}

export function OpenUISiteChrome({ children, contained = false }: { children: ReactNode; contained?: boolean }) {
  return (
    <div className={styles.page}>
      <OpenUISiteHeader />
      <div className={contained ? `${styles.app} ${styles.appContained}` : styles.app}>{children}</div>
    </div>
  );
}
