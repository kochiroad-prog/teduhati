import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PageHead,
  StatusBadge,
  QueryError,
  TableFrame,
  Td,
  Th,
  fmtDate,
  fmtNumber,
} from "@/components/admin/parts";
import { ButtonLink, EmptyState } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { adminHref } from "@/lib/admin/routes";
import { createClient } from "@/lib/supabase/server";
import type { BondingMomentRow, BondingMomentTranslationRow } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function BondingListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bonding_moments")
    .select(
      "*, bonding_moment_translations(bonding_moment_id, locale, title, prompt, why_it_matters)",
    )
    .order("sort_order")
    .order("id");

  type Joined = BondingMomentRow & {
    bonding_moment_translations: BondingMomentTranslationRow[];
  };
  const rows = (data ?? []) as unknown as Joined[];

  return (
    <div>
      <PageHead
        title={t.content.bondingTitle}
        lead={t.content.lead}
        action={
          <ButtonLink href={adminHref(locale, "bonding", "baru")}>
            {t.content.newBonding}
          </ButtonLink>
        }
      />

      <QueryError error={error} locale={locale} />

      {rows.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No bonding moments yet." : "Belum ada momen bonding."}
          lead={
            locale === "en"
              ? "Import them from content/, or write the first one here."
              : "Impor dari content/, atau tulis yang pertama di sini."
          }
        />
      ) : (
        <TableFrame
          head={
            <tr>
              <Th className="w-[6.5rem]">ID</Th>
              <Th>{t.content.colTitle}</Th>
              <Th>{t.content.momentType}</Th>
              <Th>{t.content.colAge}</Th>
              <Th numeric>{t.content.colDuration}</Th>
              <Th>{t.content.colStatus}</Th>
              <Th>{t.content.colUpdated}</Th>
            </tr>
          }
          footer={`${fmtNumber(rows.length)} ${t.common.rows}`}
        >
          {rows.map((row) => {
            const tr =
              row.bonding_moment_translations.find((r) => r.locale === locale) ??
              row.bonding_moment_translations.find((r) => r.locale === "id");
            const incomplete = row.bonding_moment_translations.length < 2;

            return (
              <tr key={row.id} className="transition-colors hover:bg-black/[0.015]">
                <Td className="font-mono text-[0.8125rem] text-ink-faint">{row.id}</Td>
                <Td>
                  <Link
                    href={adminHref(locale, "bonding", row.id)}
                    className="font-medium hover:text-sage-dark hover:underline"
                  >
                    {tr?.title ?? row.id}
                  </Link>
                  {tr?.prompt ? (
                    <span className="text-meta mt-0.5 block max-w-[46ch] truncate text-ink-faint">
                      {tr.prompt}
                    </span>
                  ) : null}
                  {incomplete ? (
                    <span className="text-meta mt-0.5 inline-block rounded-pill bg-terracotta-soft px-2 py-0.5 text-[#8f4f38]">
                      {locale === "en" ? "One language only" : "Baru satu bahasa"}
                    </span>
                  ) : null}
                </Td>
                <Td className="text-ink-muted">{row.moment_type}</Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {row.age_min_months}–{row.age_max_months}
                </Td>
                <Td numeric className="text-ink-muted">
                  {row.duration_minutes} {t.common.minutes}
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
