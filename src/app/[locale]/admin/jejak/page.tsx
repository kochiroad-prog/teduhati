import { notFound } from "next/navigation";
import {
  PageHead,
  TableFrame,
  Td,
  Th,
  fmtDateTime,
  fmtNumber,
} from "@/components/admin/parts";
import { EmptyState } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { adminHref } from "@/lib/admin/routes";
import { FilterBar } from "@/components/admin/FilterBar";
import { createClient } from "@/lib/supabase/server";
import type { AuditLogRow } from "@/types/db";

/**
 * The audit trail.
 *
 * Once content and money can be changed from a browser, "who did this" has to
 * be answerable. Every entry is written by a SECURITY DEFINER function that
 * takes the actor from `auth.uid()`, so the name on a row cannot be chosen by
 * the person performing the action.
 *
 * Read-only by design. There is no delete, because a log that can be edited is
 * not a log.
 */

export const dynamic = "force-dynamic";

const OBJECT_TYPES = [
  "activities",
  "stories",
  "bonding_moments",
  "worksheets",
  "audio_tracks",
  "profiles",
  "subscriptions",
  "app_settings",
];

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ object?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const sp = await searchParams;
  const object = sp.object ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (object && OBJECT_TYPES.includes(object)) {
    query = query.eq("object_type", object);
  }

  const { data } = await query;
  const rows = (data ?? []) as AuditLogRow[];

  return (
    <div>
      <PageHead title={t.audit.title} lead={t.audit.lead} />

      <FilterBar
        action={adminHref(locale, "audit")}
        applyLabel={t.audit.colObject}
        selects={[
          {
            name: "object",
            label: t.audit.colObject,
            value: object,
            options: OBJECT_TYPES.map((o) => ({ value: o, label: o })),
            allLabel: t.common.all,
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title={t.audit.empty} lead={t.audit.emptyLead} />
      ) : (
        <TableFrame
          head={
            <tr>
              <Th>{t.audit.colWhen}</Th>
              <Th>{t.audit.colWho}</Th>
              <Th>{t.audit.colWhat}</Th>
              <Th>{t.audit.colObject}</Th>
              <Th>{t.audit.colSummary}</Th>
            </tr>
          }
          footer={`${fmtNumber(rows.length)} ${t.common.rows}`}
        >
          {rows.map((row) => (
            <tr key={row.id}>
              <Td className="whitespace-nowrap text-ink-faint">
                {fmtDateTime(row.created_at, locale)}
              </Td>
              <Td className="text-ink-muted">{row.actor_email ?? t.common.none}</Td>
              <Td>
                <span className="text-meta rounded-pill bg-black/[0.055] px-2.5 py-1 text-ink-muted">
                  {row.action}
                </span>
              </Td>
              <Td className="text-ink-muted">
                {row.object_type}
                {row.object_id ? (
                  <span className="text-meta ml-1.5 font-mono text-ink-faint">
                    {row.object_id.length > 18
                      ? `${row.object_id.slice(0, 8)}…`
                      : row.object_id}
                  </span>
                ) : null}
              </Td>
              <Td className="max-w-[40ch] text-ink-muted">{row.summary ?? ""}</Td>
            </tr>
          ))}
        </TableFrame>
      )}
    </div>
  );
}
