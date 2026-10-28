"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { INDICES, type Indices } from "@/lib/scoring";
import { formatWeekShort } from "@/lib/week";
import { SERIES_COLOR } from "./index-style";

export type TrendPoint = { weekStart: string; indices: Indices | null };

/** 8-week line chart of the four indices. Missed weeks leave a gap in every line. */
export function TrendChart({ points, height = 180 }: { points: TrendPoint[]; height?: number }) {
  const data = points.map((p) => ({ week: formatWeekShort(p.weekStart), ...(p.indices ?? {}) }));
  const tableId = React.useId();

  return (
    <figure className="m-0">
      <div role="img" aria-label="Eight-week trend of burnout, happiness, stress and engagement" aria-describedby={tableId}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickMargin={8}
              minTickGap={16}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              width={44}
            />
            <Tooltip
              cursor={{ stroke: "var(--faint)", strokeWidth: 1 }}
              content={<TrendTooltip />}
              isAnimationActive={false}
            />
            {INDICES.map((m) => (
              <Line
                key={m.key}
                dataKey={m.key}
                name={m.short}
                type="linear"
                stroke={SERIES_COLOR[m.key]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                dot={{ r: 3, strokeWidth: 2, stroke: "var(--surface)", fill: SERIES_COLOR[m.key] }}
                activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--surface)" }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
        {INDICES.map((m) => (
          <span key={m.key} className="inline-flex items-center gap-1.5">
            <i className="inline-block h-[3px] w-3 rounded-full" style={{ background: SERIES_COLOR[m.key] }} />
            {m.short}
          </span>
        ))}
      </figcaption>

      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer select-none hover:text-foreground">View as table</summary>
        <table id={tableId} className="num mt-2 w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="py-1 pr-2 font-medium">Week</th>
              {INDICES.map((m) => (
                <th key={m.key} className="py-1 pr-2 text-right font-medium">
                  {m.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-foreground">
            {points.map((p) => (
              <tr key={p.weekStart} className="border-t border-border">
                <td className="py-1 pr-2">{formatWeekShort(p.weekStart)}</td>
                {INDICES.map((m) => (
                  <td key={m.key} className="py-1 pr-2 text-right">
                    {p.indices ? p.indices[m.key] : "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

type TooltipPayload = { dataKey?: string | number; value?: number; color?: string; name?: string };

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active) return null;
  const rows = payload ?? [];
  return (
    <div className="min-w-36 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <div className="mb-1 text-muted-foreground">Week of {label}</div>
      {rows.length === 0 ? (
        <div className="text-muted-foreground">No check-in</div>
      ) : (
        rows.map((r) => (
          <div key={String(r.dataKey)} className="flex items-center gap-2 py-0.5">
            <i className="inline-block h-[3px] w-3 rounded-full" style={{ background: r.color }} />
            <b className="num font-semibold text-foreground">{r.value}</b>
            <span className="text-muted-foreground">{r.name}</span>
          </div>
        ))
      )}
    </div>
  );
}
