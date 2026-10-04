import { Card, Notice } from "@/components/ui";
import type { ContentStatus } from "@/types/db";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { cn } from "@/lib/utils";

/**
 * The console's presentational pieces.
 *
 * Deliberately plain: a dashboard is read, not admired. Tables are real tables
 * so a screen reader and a browser's find-in-page both behave, and every figure
 * that can move carries its own comparison.
 */

export function PageHead({
  title,
  lead,
  action,
}: {
  title: string;
  lead?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[1.5rem] leading-tight text-ink">{title}</h1>
        {lead ? <p className="text-small mt-1 max-w-[62ch] text-ink-muted">{lead}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * A change against the previous period.
 *
 * Colour alone never carries the meaning: the arrow and the sign say the same
 * thing, which matters both for colour-blind readers and in a screenshot.
 */
export function Delta({
  now,
  before,
  suffix,
}: {
  now: number;
  before: number;
  suffix?: string;
}) {
  if (before === 0 && now === 0) return null;
  const diff = now - before;
  const pct = before === 0 ? null : Math.round((diff / before) * 100);
  const up = diff > 0;
  const flat = diff === 0;

  return (
    <span
      className={cn(
        "text-meta inline-flex items-center gap-1",
        flat ? "text-ink-faint" : up ? "text-sage-dark" : "text-terracotta",
      )}
    >
      <span aria-hidden="true">{flat ? "→" : up ? "↑" : "↓"}</span>
      {pct === null ? `+${diff}` : `${diff > 0 ? "+" : ""}${pct}%`}
      {suffix ? <span className="text-ink-faint">{suffix}</span> : null}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="text-meta text-ink-faint">{label}</p>
      <p className="font-display mt-1 text-[1.625rem] leading-none text-ink">{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {delta}
        {hint ? <span className="text-meta text-ink-faint">{hint}</span> : null}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------------------
   Tables
   -------------------------------------------------------------------------- */
export function TableFrame({
  head,
  children,
  footer,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="surface overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-line bg-cream-deep">{head}</thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </div>
      {footer ? (
        <div className="text-meta border-t border-line px-4 py-2.5 text-ink-faint">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function Th({
  children,
  className,
  numeric = false,
}: {
  children?: React.ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "text-meta whitespace-nowrap px-4 py-2.5 font-semibold text-ink-muted",
        numeric && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  numeric = false,
}: {
  children?: React.ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-[0.9375rem] align-middle",
        numeric && "text-right tabular-nums",
        className,
      )}
    >
      {children}
    </td>
  );
}

/* --------------------------------------------------------------------------
   Status
   -------------------------------------------------------------------------- */
const STATUS_STYLE: Record<ContentStatus, string> = {
  published: "bg-sage-soft text-sage-dark",
  review: "bg-[#fdf1d8] text-[#8a6a1f]",
  draft: "bg-black/[0.055] text-ink-muted",
  retired: "bg-black/[0.055] text-ink-faint line-through",
};

export function StatusBadge({
  status,
  locale,
}: {
  status: ContentStatus;
  locale: Locale;
}) {
  const t = adminCopy(locale);
  return (
    <span
      className={cn(
        "text-meta inline-flex items-center rounded-pill px-2.5 py-1",
        STATUS_STYLE[status],
      )}
    >
      {t.status[status]}
    </span>
  );
}

/**
 * Why something cannot be published yet.
 *
 * The list comes straight from `validate_activity` in Postgres, so what the
 * editor reads here is exactly what the database will refuse.
 */
export function Problems({
  problems,
  title,
}: {
  problems: string[];
  title: string;
}) {
  if (problems.length === 0) return null;
  return (
    <Notice tone="care" title={title}>
      <ul className="space-y-1">
        {problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Notice>
  );
}

/* --------------------------------------------------------------------------
   Formatting
   -------------------------------------------------------------------------- */
export function fmtNumber(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString("id-ID");
}

export function fmtRupiah(value: number | null | undefined): string {
  return `Rp${(value ?? 0).toLocaleString("id-ID")}`;
}

export function fmtDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(value: string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
