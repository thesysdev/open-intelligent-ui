"use client";

import { defineComponent } from "@openuidev/react-lang";
import { useEffect, useRef, useState } from "react";
import { z } from "zod/v4";

type Game = "snake" | "breakout" | "pong";
type Direction = "up" | "down" | "left" | "right";
type Status = "ready" | "playing" | "paused" | "over" | "won";
type Point = { x: number; y: number };
type ArcadeState = {
  game: Game;
  status: Status;
  score: number;
  opponent: number;
  lives: number;
  elapsed: number;
  snake: Point[];
  direction: Direction;
  nextDirection: Direction;
  food: Point;
  paddle: number;
  rival: number;
  ball: Point & { vx: number; vy: number };
  bricks: boolean[];
};
const SIZE = 320;
const GREEN = "#283e36";
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const opposite: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
export function createArcadeState(game: Game): ArcadeState {
  return {
    game,
    status: "ready",
    score: 0,
    opponent: 0,
    lives: 3,
    elapsed: 0,
    snake: [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ],
    direction: "right",
    nextDirection: "right",
    food: { x: 14, y: 10 },
    paddle: game === "pong" ? 130 : 128,
    rival: 130,
    ball: {
      x: 160,
      y: game === "pong" ? 160 : 260,
      vx: game === "pong" ? 150 : 125,
      vy: game === "pong" ? 70 : -165,
    },
    bricks: Array(24).fill(true),
  };
}
export function stepArcade(
  state: ArcadeState,
  seconds: number,
  held: Set<Direction>,
) {
  if (state.status !== "playing") return;
  if (state.game === "snake") {
    state.elapsed += seconds;
    const interval = Math.max(0.065, 0.15 - state.score * 0.001);
    if (state.elapsed < interval) return;
    state.elapsed -= interval;
    state.direction = state.nextDirection;
    const vector = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
      state.direction
    ];
    const head = {
      x: state.snake[0].x + vector[0],
      y: state.snake[0].y + vector[1],
    };
    const eating = head.x === state.food.x && head.y === state.food.y;
    const body = eating ? state.snake : state.snake.slice(0, -1);
    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= 20 ||
      head.y >= 20 ||
      body.some((part) => part.x === head.x && part.y === head.y)
    ) {
      state.status = "over";
      return;
    }
    state.snake.unshift(head);
    if (eating) {
      state.score += 10;
      const free: Point[] = [];
      for (let y = 0; y < 20; y++)
        for (let x = 0; x < 20; x++)
          if (!state.snake.some((part) => part.x === x && part.y === y))
            free.push({ x, y });
      if (!free.length) {
        state.status = "won";
        return;
      }
      state.food = free[Math.floor(Math.random() * free.length)];
    } else state.snake.pop();
    return;
  }
  const { ball } = state;
  if (state.game === "breakout") {
    const move = Number(held.has("right")) - Number(held.has("left"));
    state.paddle = clamp(state.paddle + move * 245 * seconds, 4, 252);
    const previousY = ball.y;
    ball.x += ball.vx * seconds;
    ball.y += ball.vy * seconds;
    if (ball.x < 5) {
      ball.x = 5;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x > 315) {
      ball.x = 315;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y < 5) {
      ball.y = 5;
      ball.vy = Math.abs(ball.vy);
    }
    if (
      ball.vy > 0 &&
      previousY + 5 <= 285 &&
      ball.y + 5 >= 285 &&
      ball.x >= state.paddle - 4 &&
      ball.x <= state.paddle + 68
    ) {
      ball.y = 280;
      ball.vx = ((ball.x - state.paddle - 32) / 32) * 185;
      ball.vy = -Math.max(135, 190 - Math.abs(ball.vx) * 0.2);
    }
    for (let i = 0; i < state.bricks.length; i++) {
      if (!state.bricks[i]) continue;
      const x = 12 + (i % 6) * 50,
        y = 36 + Math.floor(i / 6) * 20;
      if (
        ball.x + 5 > x &&
        ball.x - 5 < x + 46 &&
        ball.y + 5 > y &&
        ball.y - 5 < y + 14
      ) {
        state.bricks[i] = false;
        state.score += 10;
        if (previousY + 5 <= y || previousY - 5 >= y + 14) ball.vy *= -1;
        else ball.vx *= -1;
        break;
      }
    }
    if (!state.bricks.some(Boolean)) state.status = "won";
    if (ball.y > 327) {
      state.lives--;
      if (!state.lives) state.status = "over";
      else {
        ball.x = state.paddle + 32;
        ball.y = 260;
        ball.vx = 110;
        ball.vy = -165;
      }
    }
  } else {
    const move = Number(held.has("down")) - Number(held.has("up"));
    state.paddle = clamp(state.paddle + move * 225 * seconds, 0, 262);
    const distance = ball.y - (state.rival + 29);
    state.rival = clamp(
      state.rival + clamp(distance, -100 * seconds, 100 * seconds),
      0,
      262,
    );
    ball.x += ball.vx * seconds;
    ball.y += ball.vy * seconds;
    if (ball.y < 5) {
      ball.y = 5;
      ball.vy = Math.abs(ball.vy);
    }
    if (ball.y > 315) {
      ball.y = 315;
      ball.vy = -Math.abs(ball.vy);
    }
    if (
      ball.vx < 0 &&
      ball.x <= 25 &&
      ball.x >= 12 &&
      ball.y >= state.paddle - 5 &&
      ball.y <= state.paddle + 63
    ) {
      ball.x = 25;
      ball.vx = Math.min(Math.abs(ball.vx) + 10, 245);
      ball.vy = (ball.y - state.paddle - 29) * 5;
    }
    if (
      ball.vx > 0 &&
      ball.x >= 295 &&
      ball.x <= 308 &&
      ball.y >= state.rival - 5 &&
      ball.y <= state.rival + 63
    ) {
      ball.x = 295;
      ball.vx = -Math.min(Math.abs(ball.vx) + 10, 245);
      ball.vy = (ball.y - state.rival - 29) * 5;
    }
    if (ball.x < -8 || ball.x > 328) {
      if (ball.x > 328) state.score++;
      else state.opponent++;
      if (state.score >= 5) state.status = "won";
      else if (state.opponent >= 5) state.status = "over";
      else {
        ball.x = 160;
        ball.y = 160;
        ball.vx = state.score > state.opponent ? -150 : 150;
        ball.vy = 65;
      }
    }
  }
}
function paintArcade(canvas: HTMLCanvasElement | null, state: ArcadeState) {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#b8d0a0";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "#a9c194";
  for (let y = 0; y < SIZE; y += 16)
    for (let x = 0; x < SIZE; x += 16) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = GREEN;
  if (state.game === "snake") {
    state.snake.forEach((point, index) => {
      ctx.fillStyle = index ? "#3f5845" : GREEN;
      ctx.fillRect(point.x * 16 + 1, point.y * 16 + 1, 14, 14);
    });
    ctx.fillStyle = GREEN;
    ctx.fillRect(state.food.x * 16 + 3, state.food.y * 16 + 4, 10, 10);
    ctx.fillRect(state.food.x * 16 + 7, state.food.y * 16 + 1, 3, 3);
  } else if (state.game === "breakout") {
    state.bricks.forEach((visible, i) => {
      if (!visible) return;
      ctx.fillStyle = i < 12 ? GREEN : "#526a4d";
      ctx.fillRect(12 + (i % 6) * 50, 36 + Math.floor(i / 6) * 20, 46, 14);
      ctx.fillStyle = "#7e966c";
      ctx.fillRect(14 + (i % 6) * 50, 38 + Math.floor(i / 6) * 20, 42, 2);
    });
    ctx.fillStyle = GREEN;
    ctx.fillRect(state.paddle, 285, 64, 9);
    ctx.fillRect(state.ball.x - 4, state.ball.y - 4, 8, 8);
    ctx.font = "12px monospace";
    ctx.fillText("♥ ".repeat(state.lives), 12, 312);
  } else {
    ctx.fillStyle = "#879f73";
    for (let y = 0; y < 320; y += 17) ctx.fillRect(158, y, 4, 9);
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(state.score), 117, 43);
    ctx.fillText(String(state.opponent), 203, 43);
    ctx.textAlign = "left";
    ctx.fillStyle = GREEN;
    ctx.fillRect(14, state.paddle, 7, 58);
    ctx.fillRect(299, state.rival, 7, 58);
    ctx.fillRect(state.ball.x - 4, state.ball.y - 4, 8, 8);
  }
}

export function RetroConsoleView({
  title = "Pixel Palace",
  game = "snake",
}: { title?: string; game?: Game } = {}) {
  const initialGame = ["snake", "breakout", "pong"].includes(game)
    ? game
    : "snake";
  const canvas = useRef<HTMLCanvasElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const engine = useRef(createArcadeState(initialGame));
  const held = useRef(new Set<Direction>());
  const [mode, setMode] = useState<Game>(initialGame);
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<Record<Game, number>>({
    snake: 0,
    breakout: 0,
    pong: 0,
  });
  const sync = () => {
    setStatus(engine.current.status);
    setScore(engine.current.score);
    setBest((current) =>
      engine.current.score > current[engine.current.game]
        ? { ...current, [engine.current.game]: engine.current.score }
        : current,
    );
  };
  const reset = (next: Game = mode) => {
    engine.current = createArcadeState(next);
    held.current.clear();
    setMode(next);
    setStatus("ready");
    setScore(0);
    paintArcade(canvas.current, engine.current);
  };
  const playPause = () => {
    const current = engine.current;
    if (current.status === "over" || current.status === "won") {
      engine.current = createArcadeState(mode);
      engine.current.status = "playing";
    } else current.status = current.status === "playing" ? "paused" : "playing";
    sync();
    consoleRef.current?.focus({ preventScroll: true });
  };
  const move = (direction: Direction) => {
    held.current.add(direction);
    if (direction !== opposite[engine.current.direction])
      engine.current.nextDirection = direction;
  };
  useEffect(() => {
    let frame = 0,
      previous = 0,
      accumulator = 0;
    const tick = (now: number) => {
      const current = engine.current;
      if (current.status === "playing") {
        accumulator += previous ? Math.min((now - previous) / 1000, 0.05) : 0;
        const beforeScore = current.score,
          beforeStatus = current.status;
        while (accumulator >= 1 / 60) {
          stepArcade(current, 1 / 60, held.current);
          accumulator -= 1 / 60;
        }
        if (current.score !== beforeScore) {
          setScore(current.score);
          setBest((values) => ({
            ...values,
            [current.game]: Math.max(values[current.game], current.score),
          }));
        }
        if (current.status !== beforeStatus) setStatus(current.status);
      } else accumulator = 0;
      previous = now;
      paintArcade(canvas.current, current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const pauseWhenHidden = () => {
      if (document.hidden && engine.current.status === "playing") {
        engine.current.status = "paused";
        setStatus("paused");
        held.current.clear();
      }
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, []);
  const keyDirection: Record<string, Direction> = {
    ArrowUp: "up",
    w: "up",
    ArrowDown: "down",
    s: "down",
    ArrowLeft: "left",
    a: "left",
    ArrowRight: "right",
    d: "right",
  };
  const gameDescription =
    mode === "snake"
      ? "Eat the fruit. Avoid the walls and your own tail."
      : mode === "breakout"
        ? "Clear the bricks. Keep the ball in play."
        : "You’re on the left. First to 5 wins.";
  return (
    <section className="iui-retro" aria-label="Retro game console">
      <div className="iui-retro-brand">
        <h2>{title || "Pixel Palace"}</h2>
        <span>1989 edition</span>
      </div>
      <div className="iui-retro-modes" aria-label="Choose a game">
        {(["snake", "breakout", "pong"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => reset(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div
        className="iui-retro-shell"
        ref={consoleRef}
        tabIndex={0}
        role="group"
        aria-label={`${mode} game controls. Use arrow keys and space to pause.`}
        onKeyDown={(event) => {
          const direction = keyDirection[event.key];
          if (direction) {
            event.preventDefault();
            move(direction);
          }
          if (
            (event.key === " " || event.key === "Enter") &&
            !event.repeat &&
            event.target === event.currentTarget
          ) {
            event.preventDefault();
            playPause();
          }
          if (event.key.toLowerCase() === "r" && !event.repeat) {
            event.preventDefault();
            reset();
          }
        }}
        onKeyUp={(event) => {
          const direction = keyDirection[event.key];
          if (direction) {
            event.preventDefault();
            held.current.delete(direction);
          }
        }}
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            held.current.clear();
            if (engine.current.status === "playing") {
              engine.current.status = "paused";
              setStatus("paused");
            }
          }
        }}
      >
        <div className="iui-retro-shell-brand">
          <span>
            Pixelboy <b>★</b>
          </span>
          <span>8-bit system</span>
        </div>
        <div className="iui-retro-frame">
          <div className="iui-retro-score">
            <span>Score {String(score).padStart(3, "0")}</span>
            <span>Best {String(best[mode]).padStart(3, "0")}</span>
          </div>
          <div className="iui-retro-screen">
            <canvas
              width={320}
              height={320}
              ref={canvas}
              aria-label={`${mode}. Score ${score}. ${status}.`}
            />
            {status !== "playing" && (
              <div className="iui-retro-overlay">
                <strong>
                  {status === "ready"
                    ? mode
                    : status === "paused"
                      ? "Paused"
                      : status === "won"
                        ? "You win!"
                        : "Game over"}
                </strong>
                <p>
                  {status === "ready"
                    ? gameDescription
                    : status === "paused"
                      ? "Your game is right here."
                      : `Final score: ${score}`}
                </p>
                <button type="button" onClick={playPause}>
                  {status === "paused"
                    ? "▶ Resume"
                    : status === "ready"
                      ? "▶ Start game"
                      : "↻ Play again"}
                </button>
              </div>
            )}
          </div>
          <div className="iui-retro-power">
            <span>
              ● Power <b>{status === "playing" ? "On" : "Standby"}</b>
            </span>
            <span>
              {mode === "pong"
                ? "First to 5"
                : `Level ${String(1 + Math.floor(score / 50)).padStart(2, "0")}`}
            </span>
          </div>
        </div>
        <div className="iui-retro-controls">
          <div className="iui-retro-dpad">
            {(["up", "left", "right", "down"] as const).map((direction) => (
              <button
                type="button"
                key={direction}
                className={`iui-retro-key iui-retro-${direction}`}
                aria-label={`Move ${direction}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  move(direction);
                }}
                onPointerUp={() => held.current.delete(direction)}
                onPointerCancel={() => held.current.delete(direction)}
                onClick={(event) => {
                  if (event.detail === 0) {
                    move(direction);
                    window.setTimeout(
                      () => held.current.delete(direction),
                      150,
                    );
                  }
                }}
              >
                {{ up: "▲", down: "▼", left: "◀", right: "▶" }[direction]}
              </button>
            ))}
            <span aria-hidden="true">✦</span>
          </div>
          <div className="iui-retro-action-buttons">
            <button
              type="button"
              aria-label="Reset game"
              onClick={() => reset()}
            >
              B
            </button>
            <button
              type="button"
              aria-label={
                status === "playing" ? "Pause game" : "Start or resume game"
              }
              onClick={playPause}
            >
              A
            </button>
          </div>
        </div>
        <div className="iui-retro-system-buttons">
          <div>
            <button type="button" onClick={() => reset()}>
              Select
            </button>
            <span>Reset</span>
          </div>
          <div>
            <button type="button" onClick={playPause}>
              Start
            </button>
            <span>Pause / play</span>
          </div>
        </div>
        <div className="iui-retro-speaker" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </div>
      <p className="iui-retro-help">
        {mode === "pong"
          ? "↑ ↓ to move"
          : mode === "breakout"
            ? "← → to move"
            : "Arrow keys to move"}{" "}
        · Space to pause
        <br />
        <span>Play a little. Stay curious. ★</span>
      </p>
      <p className="iui-retro-sr" role="status">
        {status === "over" || status === "won"
          ? `${status === "won" ? "You win" : "Game over"}. Final score ${score}.`
          : ""}
      </p>
    </section>
  );
}

export const RetroConsole = defineComponent({
  name: "RetroGame",
  description:
    "Playable retro handheld console with Snake, Breakout and Pong, real collision physics, scoring, keyboard and touch directional controls, pause and restart. game selects the initial game. Retro beige handheld housing and green pixel screen.",
  props: z.object({
    title: z.string(),
    game: z.enum(["snake", "breakout", "pong"]),
  }),
  component: ({ props }) => (
    <RetroConsoleView key={props.game} title={props.title} game={props.game} />
  ),
});
