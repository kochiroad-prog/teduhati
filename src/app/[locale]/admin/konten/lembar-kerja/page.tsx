import { notFound } from "next/navigation";
import {
  PageHead,
  StatusBadge,
  TableFrame,
  Td,
  Th,
  fmtDate,
  fmtNumber,
} from "@/components/admin/parts";
import { EmptyState, Notice } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { WorksheetRow, WorksheetTranslationRow } from "@/types/db";

/**
 * Worksheets.
 *
 * There is no PDF yet and no upload pipeline for one, so this page lists what
 * exists and says plainly what is missing rather than offering a "new worksheet"
 * button that would create a row pointing at no file. A row with no file is
 * worse than no row: the app would offer a parent a download that 404s.
 */

export const dynamic = "force-dynamic";

export default async function WorksheetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    supabase
      .from("worksheets")
      .select("*, worksheet_translations(worksheet_id, locale, title, description)")
      .order("id"),
    getSettings(),
  ]);

  type Joined = WorksheetRow & { worksheet_translations: WorksheetTranslationRow[] };
  const rows = (data ?? []) as unknown as Joined[];

  return (
    <div>
      <PageHead title={t.content.worksheetsTitle} lead={t.content.lead} />

      <div className="mb-5">
        <Notice title={settings.features.worksheets ? t.settings.on : t.settings.off}>
          {locale === "en"
            ? "Worksheets need a PDF in the illustrations bucket and a download route before a row here means anything to a parent. Until both exist, the feature switch stays off and the app does not show the section at all."
            : "Lembar kerja memerlukan berkas PDF di bucket illustrations dan rute unduhan sebelum baris di sini berarti apa pun bagi orang tua. Sampai keduanya ada, sakelar fiturnya tetap mati dan aplikasi tidak menampilkan bagian ini."}
        </Notice>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No worksheets yet." : "Belum ada lembar kerja."}
          lead={
            locale === "en"
              ? "They will appear here once the PDFs are produced."
              : "Akan muncul di sini setelah berkas PDF-nya dibuat."
          }
        />
      ) : (
        <TableFrame
          head={
            <tr>
              <Th className="w-[6.5rem]">ID</Th>
              <Th>{t.content.colTitle}</Th>
              <Th>{t.content.colDomain}</Th>
              <Th>{t.content.colAge}</Th>
              <Th numeric>{t.content.colPages}</Th>
              <Th>{t.content.colFile}</Th>
              <Th>{t.content.colStatus}</Th>
              <Th>{t.content.colUpdated}</Th>
            </tr>
          }
          footer={`${fmtNumber(rows.length)} ${t.common.rows}`}
        >
          {rows.map((row) => {
            const tr =
              row.worksheet_translations.find((r) => r.locale === locale) ??
              row.worksheet_translations.find((r) => r.locale === "id");
            return (
              <tr key={row.id}>
                <Td className="font-mono text-[0.8125rem] text-ink-faint">{row.id}</Td>
                <Td>{tr?.title ?? row.id}</Td>
                <Td className="text-ink-muted">{row.primary_domain}</Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {row.age_min_months}–{row.age_max_months}
                </Td>
                <Td numeric className="text-ink-muted">
                  {row.page_count}
                </Td>
                <Td className={row.file_path ? "text-ink-muted" : "text-terracotta"}>
                  {row.file_path ?? t.content.audioMissing}
                </Td>
                <Td>
                  <StatusBadge status={row.status} locale={locale} />
                </Td>
                <Td className="whitespace-nowrap text-ink-faint">
                  {fmtDate(row.updated_at, locale)}
                </Td>
              </tr>
            );
          })}
        </TableFrame>
      )}
    </div>
  );
}
