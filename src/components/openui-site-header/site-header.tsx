"use client";

// The openui.com site header (logo, nav, Resources menu, GitHub stars), ported from
// thesysdev/openui docs/components/site-marketing-header.tsx so the demo matches the main site.

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Asterisk, BookOpen, ChevronDown } from "./icons";
import { DOCS_HREF, GITHUB_HREF, HOME_HREF, NAV_LINKS, RESOURCES, RESOURCES_TITLE, type NavChild } from "./nav-items";
import wordmark from "./openui-logo-wordmark.svg";
import styles from "./site-header.module.css";

const STAR_FALLBACK = 10890;
const LIST_TRACK = 200;
const PANEL_PADDING = 20;
const GROUP_GAP = 24;
const VIEWPORT_MARGIN = 16;
const POINTER_SLACK = 12;
const NEIGHBOUR_DWELL_MS = 150;
const BANNER_LINGER_MS = 400;

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

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
      aria-label={`Star us on GitHub — ${count} stars`}
    >
      <GitHubMark className={styles.githubMark} />
      <span className={styles.githubCount} aria-hidden="true">
        {count}
      </span>
      <span className={styles.githubStars} aria-hidden="true">
        stars
      </span>
    </a>
  );
}

function MenuRow({ child, onHover }: { child: NavChild; onHover: (child: NavChild | null) => void }) {
  const Icon = child.icon;
  return (
    <a
      className={styles.listItem}
      href={child.href}
      role="menuitem"
      onPointerEnter={() => onHover(child)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(child)}
      onBlur={() => onHover(null)}
    >
      <span className={styles.listIcon} aria-hidden="true">
        <Icon className={styles.listGlyph} />
        <span className={styles.listArrow}>
          <ArrowRight />
        </span>
      </span>
      <span className={styles.listTitle}>{child.title}</span>
      {child.tag && <span className={styles.itemTag}>{child.tag}</span>}
    </a>
  );
}

function PrimaryNav() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<NavChild | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const watcherRef = useRef<((event: PointerEvent) => void) | null>(null);
  const neighbourTimerRef = useRef<number | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  const stopWatching = () => {
    if (watcherRef.current) document.removeEventListener("pointermove", watcherRef.current);
    watcherRef.current = null;
  };
  const cancelNeighbourClose = () => {
    if (neighbourTimerRef.current !== null) window.clearTimeout(neighbourTimerRef.current);
    neighbourTimerRef.current = null;
  };
  const cancelBannerClear = () => {
    if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = null;
  };
  const close = () => {
    stopWatching();
    cancelNeighbourClose();
    cancelBannerClear();
    setOpen(false);
    setHovered(null);
  };

  useEffect(
    () => () => {
      stopWatching();
      cancelNeighbourClose();
      cancelBannerClear();
    },
    [],
  );

  // The panel is centred on the window and sized from the data, as on openui.com.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    const nav = navRef.current;
    if (!open || !viewport || !content || !nav) return;
    const place = () => {
      const viewportWidth = document.documentElement.clientWidth;
      const natural = PANEL_PADDING * 2 + RESOURCES.length * LIST_TRACK + GROUP_GAP * (RESOURCES.length - 1);
      const width = Math.min(natural, viewportWidth - VIEWPORT_MARGIN * 2);
      content.style.width = `${width}px`;
      const left = Math.min(Math.max((viewportWidth - width) / 2, VIEWPORT_MARGIN), viewportWidth - width - VIEWPORT_MARGIN);
      viewport.style.width = `${width}px`;
      viewport.style.height = `${content.offsetHeight}px`;
      viewport.style.translate = `${left - nav.getBoundingClientRect().left}px 0`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, hovered]);

  // Leaving the nav only closes the menu once the pointer is outside the nav + panel box,
  // so a diagonal reach for a row never closes it.
  const watchPointer = () => {
    stopWatching();
    const onMove = (event: PointerEvent) => {
      const nav = navRef.current;
      const panel = viewportRef.current;
      if (!nav || !panel) return;
      const a = nav.getBoundingClientRect();
      const b = panel.getBoundingClientRect();
      const inside =
        event.clientX >= Math.min(a.left, b.left) - POINTER_SLACK &&
        event.clientX <= Math.max(a.right, b.right) + POINTER_SLACK &&
        event.clientY >= Math.min(a.top, b.top) - POINTER_SLACK &&
        event.clientY <= Math.max(a.bottom, b.bottom) + POINTER_SLACK;
      if (!inside) close();
    };
    watcherRef.current = onMove;
    document.addEventListener("pointermove", onMove);
  };

  const onRowHover = (child: NavChild | null) => {
    cancelBannerClear();
    if (child) setHovered(child);
    else bannerTimerRef.current = window.setTimeout(() => setHovered(null), BANNER_LINGER_MS);
  };

  return (
    <nav
      className={styles.primaryNav}
      ref={navRef}
      onPointerLeave={watchPointer}
      onPointerOver={stopWatching}
      onKeyDown={(event) => event.key === "Escape" && close()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      {NAV_LINKS.map((link) => (
        <a
          key={link.href}
          className={styles.link}
          href={link.href}
          onPointerEnter={() => {
            cancelNeighbourClose();
            neighbourTimerRef.current = window.setTimeout(close, NEIGHBOUR_DWELL_MS);
          }}
          onPointerLeave={cancelNeighbourClose}
        >
          {link.title}
        </a>
      ))}
      <div className={styles.dropdown} onPointerEnter={() => setOpen(true)}>
        <button
          type="button"
          className={`${styles.link} ${styles.dropdownTrigger} ${open ? styles.dropdownTriggerOpen : ""}`.trim()}
          aria-haspopup="menu"
          aria-expanded={open}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(!open)}
        >
          {RESOURCES_TITLE}
        </button>
      </div>
      <div className={styles.viewport} data-open={open ? "true" : "false"} ref={viewportRef}>
        <div className={styles.viewportContent} ref={contentRef} inert={!open} role="menu" aria-label={RESOURCES_TITLE}>
          <div className={styles.columns}>
            {RESOURCES.map((group) => (
              <div className={styles.column} key={group.label} role="group" aria-label={group.label}>
                <p className={styles.groupLabel}>{group.label}</p>
                <div className={styles.groupList}>
                  {group.children.map((child) => (
                    <MenuRow key={child.href} child={child} onHover={onRowHover} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {hovered && (
            <div className={styles.banner}>
              <Asterisk className={styles.bannerIcon} />
              <span>{hovered.description}</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openSection, setOpenSection] = useState<string | null>(RESOURCES[0].label);
  return (
    <div className={styles.mobileLayer} data-open={open ? "true" : "false"} inert={!open}>
      <div className={styles.mobileBackdrop} onClick={onClose} />
      <div className={styles.mobileTray}>
        <div className={styles.mobileTrayInner}>
          {RESOURCES.map((group) => {
            const isOpen = openSection === group.label;
            const items = group.label === "Other" ? [...group.children, { ...NAV_LINKS[0], description: "", icon: ArrowRight }] : group.children;
            return (
              <div key={group.label} className={styles.mobileTraySection}>
                <button
                  type="button"
                  className={styles.mobileTraySectionHeading}
                  aria-expanded={isOpen}
                  onClick={() => setOpenSection(isOpen ? null : group.label)}
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`${styles.mobileTrayChevron} ${isOpen ? styles.mobileTrayChevronOpen : ""}`.trim()} />
                </button>
                <div className={styles.mobileTraySectionItems} data-open={isOpen ? "true" : "false"}>
                  <div>
                    {items.map((item) => (
                      <a key={item.href} className={styles.mobileTrayLink} href={item.href} onClick={onClose}>
                        <span>{item.title}</span>
                        {"tag" in item && item.tag && <span className={styles.mobileTrayBadge}>{item.tag}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          <div className={styles.mobileTrayFooter}>
            <a className={styles.mobileTrayDocsLink} href={DOCS_HREF} onClick={onClose}>
              <BookOpen />
              <span>Docs</span>
            </a>
            <GitHubButton />
          </div>
        </div>
      </div>
    </div>
  );
}

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={styles.hamburgerIcon}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {isOpen ? (
        <>
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </>
      ) : (
        <>
          <path d="M3 12h18" />
          <path d="M3 6h18" />
          <path d="M3 18h18" />
        </>
      )}
    </svg>
  );
}

export function OpenUISiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <a href={HOME_HREF} className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wordmark.src} alt="OpenUI" className={styles.wordmark} />
        </a>
        <div className={styles.center}>
          <PrimaryNav />
        </div>
        <div className={styles.end}>
          <div className={styles.desktopActions}>
            <GitHubButton />
          </div>
          <button
            type="button"
            className={styles.mobileMenuButton}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <HamburgerIcon isOpen={menuOpen} />
          </button>
        </div>
      </div>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
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
