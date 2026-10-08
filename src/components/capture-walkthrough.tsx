"use client";

import { useEffect, useRef, useState } from "react";
import { useThread } from "@openuidev/react-ui";
import motion from "@/lib/capture-scroll.json";

/** Film-only walkthrough. The path follows the scroll cadence measured from the
 * supplied reference recording; it moves the real response, never a screenshot. */
export function CaptureWalkthrough() {
  const running = useThread((state) => state.isRunning);
  const frame = useRef(0);
  const cursor = useRef<SVGSVGElement>(null);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const start = () => {
    const area = document.querySelector<HTMLElement>(".openui-agent-thread-scroll-area");
    const shell = document.querySelector<HTMLElement>("[data-agent-shell]");
    if (!area || !shell || running) return;
    cancelAnimationFrame(frame.current);
    const started = performance.now();
    const maximum = area.scrollHeight - area.clientHeight;
    setPlaying(true);
    setVisible(true);
    Object.assign(shell.dataset, { walkthroughStartedMs: String(started), walkthroughState: "playing" });
    const tick = (now: number) => {
      const time = Math.min((now - started) / 1000, motion.duration);
      let index = 0;
      while (index < motion.frames.length - 2 && motion.frames[index + 1][0] < time) index++;
      const [t0, y0] = motion.frames[index];
      const [t1, y1] = motion.frames[index + 1];
      const mix = Math.min(1, Math.max(0, (time - t0) / (t1 - t0)));
      area.scrollTo({ top: (y0 + (y1 - y0) * mix) * maximum, behavior: "instant" });
      if (cursor.current) {
        const x = innerWidth * (.75 + .045 * Math.sin(time * .32));
        const y = innerHeight * (.72 + .1 * Math.sin(time * .23 + .8));
        cursor.current.style.transform = `translate3d(${x}px,${y}px,0)`;
      }
      if (time < motion.duration) frame.current = requestAnimationFrame(tick);
      else { shell.dataset.walkthroughState = "complete"; setPlaying(false); }
    };
    frame.current = requestAnimationFrame(tick);
  };
  return <>
    <button className="sf-capture-walkthrough" onClick={start} disabled={running || playing}>Walk through response</button>
    <svg ref={cursor} className={`sf-capture-cursor${visible ? " is-visible" : ""}`} width="24" height="32" viewBox="0 0 24 32" aria-hidden="true"><path d="M3 2v24l6.7-6.1 4.8 9.2 4-2.1-4.7-9.1 8.1-1.3Z" fill="#111" stroke="white" strokeWidth="1.5" strokeLinejoin="round" /></svg>
  </>;
}
