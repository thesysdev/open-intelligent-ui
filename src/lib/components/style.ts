// Helpers for the app's own components (SearchImage, the map, the coach and chess pieces).
// Everything else renders with @openuidev/intelligent-ui-library.
import { tagSchemaId } from "@openuidev/react-lang";
import { z } from "zod/v4";

function protocolOf(value: string): string | null {
  try {
    return new URL(value.trim()).protocol;
  } catch {
    return null;
  }
}

/** An absolute http(s) URL, or null. Relative URLs would resolve against this app. */
export function webUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const protocol = protocolOf(value);
  return protocol === "http:" || protocol === "https:" ? value.trim() : null;
}

export const radiusSchema = z.union([z.enum(["sm", "md", "lg", "xl", "full"]), z.number()]);
tagSchemaId(radiusSchema, "Radius");

export function size(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return `${Math.max(0, value)}px`;
  if (typeof value !== "string") return undefined;
  if (/^\d+(\.\d+)?$/.test(value.trim())) return `${value.trim()}px`;
  return /^\d+(\.\d+)?(px|%|em|rem|vh|vw|fr)$|^auto$/.test(value.trim()) ? value.trim() : undefined;
}

const RADIUS: Record<string, string> = {
  sm: "var(--iui-radius-sm)",
  md: "var(--iui-radius-md)",
  lg: "var(--iui-radius-lg)",
  xl: "var(--iui-radius-xl)",
  full: "999px",
};
export const radius = (value: unknown) => (typeof value === "string" ? RADIUS[value] : size(value));

export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ") || undefined;

