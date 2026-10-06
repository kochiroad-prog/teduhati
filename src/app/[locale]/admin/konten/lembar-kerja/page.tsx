import { notFound } from "next/navigation";
import { FilterBar } from "@/components/admin/FilterBar";
import { PageHead, QueryError } from "@/components/admin/parts";
import { WorksheetManager } from "@/components/admin/WorksheetManager";
import { EmptyState, Notice } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { getAdminContext } from "@/lib/admin/guard";
import { adminHref } from "@/lib/admin/routes";
import { getTaxonomy } from "@/lib/admin/taxonomy";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { ContentStatus, WorksheetRow, WorksheetTranslationRow } from "@/types/db";

/**
 * Worksheets.
 *
 * Rows get here through `npm run worksheets:import`, which uploads a folder of
 * PDFs into the private bucket and writes one draft row each. The work on this
 * screen is correcting what the importer could only guess — the age range, the
 * domain, the title taken from a filename — and then publishing.
 */

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const STATUSES: ContentStatus[] = ["draft", "review", "published", "retired"];

export default async function WorksheetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; domain?: string; status?: string; page?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const domain = sp.domain ?? "";
  const status = sp.status ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const [ctx, settings, taxonomy] = await Promise.all([
    getAdminContext(),
    getSettings(),
    getTaxonomy(locale),
  ]);
  const supabase = await createClient();

  let query = supabase
    .from("worksheets")
    .select(
      "*, worksheet_translations(worksheet_id, locale, title, description)",
      { count: "exact" },
    );

  if (domain) query = query.eq("primary_domain", domain);
  if (status && (STATUSES as string[]).includes(status)) {
    query = query.eq("status", status as ContentStatus);
  }
  // Searching the original filename, not the title: that is what an editor has
  // in hand when they are looking for a particular sheet from the pack.
  if (q) query = query.ilike("source_name", `%${q}%`);

  const { data, count, error } = await query
    .order("sort_order")
    .order("id")
    .range(from, from + PAGE_SIZE - 1);

  type Joined = WorksheetRow & { worksheet_translations: WorksheetTranslationRow[] };
  const rows = (data ?? []) as unknown as Joined[];
  const total = count ?? 0;

  return (
    <div>
      <PageHead
        title={t.content.worksheetsTitle}
        lead={
          locale === "en"
            ? "A private bucket: downloads go through a short-lived signed URL, issued only after the subscription has been checked."
            : "Bucket privat: unduhan lewat URL bertanda tangan berumur pendek, diterbitkan hanya setelah langganan diperiksa."
        }
      />

      {!settings.features.worksheets ? (
        <div className="mb-5">
          <Notice title={t.settings.off}>
            {locale === "en"
              ? "The worksheet section is switched off, so parents cannot see or download any of these yet. Turn it on under Settings once enough sheets are published."
              : "Bagian lembar kerja sedang dimatikan, jadi orang tua belum bisa melihat atau mengunduhnya. Nyalakan di Pengaturan setelah cukup banyak yang tayang."}
          </Notice>
        </div>
      ) : null}

      <FilterBar
        action={adminHref(locale, "worksheets")}
        search={q}
        searchLabel={t.common.search}
        searchPlaceholder={
          locale === "en" ? "Original filename…" : "Nama berkas asli…"
        }
        applyLabel={t.common.search}
        selects={[
          {
            name: "domain",
            label: t.content.filterDomain,
            value: domain,
            options: taxonomy.domains,
            allLabel: t.common.all,
          },
          {
            name: "status",
            label: t.content.filterStatus,
            value: status,
            options: STATUSES.map((s) => ({ value: s, label: t.status[s] })),
            allLabel: t.common.all,
          },
        ]}
      />

      <QueryError error={error} locale={locale} />

      {rows.length === 0 ? (
        <EmptyState
          title={
            total === 0
              ? locale === "en"
                ? "No worksheets yet."
                : "Belum ada lembar kerja."
              : t.common.noResults
          }
          lead={
            total === 0
              ? locale === "en"
                ? "Import a folder of PDFs with: npm run worksheets:import -- --dir ... --age 24-48 --domain fine_motor"
                : "Impor satu folder PDF dengan: npm run worksheets:import -- --dir ... --age 24-48 --domain fine_motor"
              : t.common.noResultsLead
          }
        />
      ) : (
        <WorksheetManager
          locale={locale}
          rows={rows}
          domains={taxonomy.domains}
          canPublish={ctx.isAdmin}
        />
      )}
    </div>
  );
}
