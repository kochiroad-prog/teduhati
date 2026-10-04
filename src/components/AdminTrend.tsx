"use client";

import { useId, useState } from "react";
import type { AdminDailyRow } from "@/types/db";

/**
 * Sign-ups and completed activities over the last 30 days.
 *
 * Two series over time, so: a line chart, one y-axis, a legend plus direct
 * labels at the right-hand end so identity never rests on colour alone, and a
 * crosshair tooltip because an SVG chart on a page is interactive by default.
 *
 * The two hues are not the brand's sage and terracotta. That pair measures ΔE
 * 12.9 for normal vision and 5.3 under deuteranopia — below the readable floor,
 * so the lines would be hard to tell apart. These two were validated instead:
 * ΔE 23.4 normal, 16.1 protan.
 */

const SIGNUPS = "#b4612f";
const COMPLETIONS = "#1d6f99";

const W = 720;
const H = 200;
const PAD = { top: 14, right: 86, bottom: 26, left: 34 };

export function AdminTrend({
  data,
  labels,
}: {
  data: AdminDailyRow[];
  labels: { signups: string; completions: string };
}) {
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return <div className="surface h-[200px]" />;
  }

  const max = Math.max(1, ...data.flatMap((d) => [d.signups, d.completions]));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (i / Math.max(1, data.length - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const path = (key: "signups" | "completions") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");

  const last = data[data.length - 1];
  const active = hover === null ? null : data[hover];

  // Four evenly spaced date ticks keep the axis readable at 30 points.
  const tickEvery = Math.max(1, Math.floor(data.length / 4));

  return (
    <figure className="surface p-4">
      <figcaption className="mb-3 flex flex-wrap items-center gap-4">
        {[
          [labels.signups, SIGNUPS],
          [labels.completions, COMPLETIONS],
        ].map(([label, colour]) => (
          <span key={label} className="text-meta flex items-center gap-2 text-ink-muted">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: colour }}
            />
            {label}
          </span>
        ))}
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${labels.signups} & ${labels.completions}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - box.left) / box.width) * W;
          const i = Math.round(((px - PAD.left) / plotW) * (data.length - 1));
          setHover(Math.min(data.length - 1, Math.max(0, i)));
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* recessive gridlines and value labels */}
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y(max * f)}
              y2={y(max * f)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(max * f) + 4}
              textAnchor="end"
              className="fill-[var(--color-ink-faint)] text-[11px]"
            >
              {Math.round(max * f)}
            </text>
          </g>
        ))}

        {data.map((d, i) =>
          i % tickEvery === 0 || i === data.length - 1 ? (
            <text
              key={d.day}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-[var(--color-ink-faint)] text-[11px]"
            >
              {d.day.slice(8)}/{d.day.slice(5, 7)}
            </text>
          ) : null,
        )}

        <g clipPath={`url(#${clipId})`}>
          <path d={path("completions")} fill="none" stroke={COMPLETIONS} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d={path("signups")} fill="none" stroke={SIGNUPS} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </g>

        {/* direct labels at the end, so the lines are identified without the legend */}
        <text x={PAD.left + plotW + 8} y={y(last.completions) + 4} className="fill-[var(--color-ink-muted)] text-[11px]">
          {labels.completions}
        </text>
        <text x={PAD.left + plotW + 8} y={y(last.signups) + 4} className="fill-[var(--color-ink-muted)] text-[11px]">
          {labels.signups}
        </text>

        {active ? (
          <g>
            <line
              x1={x(hover!)}
              x2={x(hover!)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--color-ink-faint)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={x(hover!)} cy={y(active.completions)} r="4.5" fill={COMPLETIONS} stroke="#fffdf8" strokeWidth="2" />
            <circle cx={x(hover!)} cy={y(active.signups)} r="4.5" fill={SIGNUPS} stroke="#fffdf8" strokeWidth="2" />
          </g>
        ) : null}
      </svg>

      <p className="text-small mt-2 min-h-[1.4em] text-ink-muted" aria-live="polite">
        {active
          ? `${active.day} — ${labels.signups}: ${active.signups}, ${labels.completions}: ${active.completions}`
          : ""}
      </p>
    </figure>
  );
}
