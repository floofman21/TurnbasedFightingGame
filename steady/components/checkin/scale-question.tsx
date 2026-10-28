"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const VALUES = [1, 2, 3, 4, 5] as const;

type ScaleQuestionProps = {
  id: string;
  title: string;
  low: string;
  high: string;
  value: number;
  onChange: (value: number) => void;
};

/**
 * A 1–5 radio group drawn as segmented buttons. Behaves like native radios:
 * one tab stop, arrow keys move and select, Home/End jump to the ends.
 */
export function ScaleQuestion({ id, title, low, high, value, onChange }: ScaleQuestionProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const tabStop = value || 1;

  const select = (next: number) => {
    onChange(next);
    refs.current[next - 1]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, current: number) => {
    const moves: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowDown: current + 1,
      ArrowLeft: current - 1,
      ArrowUp: current - 1,
      Home: 1,
      End: 5,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(((moves[e.key] - 1 + 5) % 5) + 1);
  };

  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={`${id}-ends`} className="py-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span id={`${id}-label`} className="font-semibold">
          {title}
        </span>
        <small className={cn("num shrink-0 text-xs", value ? "text-foreground" : "text-muted-foreground")}>
          {value ? `${value} / 5` : "Pick one"}
        </small>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {VALUES.map((n) => {
          const checked = value === n;
          return (
            <button
              key={n}
              ref={(el) => {
                refs.current[n - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${n}${n === 1 ? `, ${low}` : n === 5 ? `, ${high}` : ""}`}
              tabIndex={n === tabStop ? 0 : -1}
              onClick={() => select(n)}
              onKeyDown={(e) => onKeyDown(e, n)}
              className={cn(
                "h-11 rounded-md border font-display text-base font-semibold transition-colors",
                checked
                  ? "border-brand bg-brand text-on-brand"
                  : "border-border bg-surface text-muted-foreground hover:border-brand hover:text-foreground",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div id={`${id}-ends`} className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span>
          <span className="sr-only">1 means </span>
          {low}
        </span>
        <span>
          <span className="sr-only">5 means </span>
          {high}
        </span>
      </div>
    </div>
  );
}
