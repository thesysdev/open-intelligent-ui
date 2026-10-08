"use client";

import type { InputHTMLAttributes } from "react";

/** The same native, keyboard-accessible range control across every experience. */
export function RangeInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <input {...props} type="range" className={`iui-range ${className}`} />;
}
