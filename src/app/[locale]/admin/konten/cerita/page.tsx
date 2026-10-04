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
import { parsePages, type StoryRow, type StoryTranslationRow } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function StoriesPage({
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
    .from("stories")
    .select("*, story_translations(story_id, locale, title, pages)")
    .order("id");

  type Joined = StoryRow & { story_translations: StoryTranslationRow[] };
  const rows = (data ?? []) as unknown as Joined[];

  return (
    <div>
      <PageHead
        title={t.content.storiesTitle}
        lead={t.content.lead}
        action={
          <ButtonLink href={adminHref(locale, "stories", "baru")}>
            {t.content.newStory}
          </ButtonLink>
        }
      />

      <QueryError error={error} locale={locale} />

      {rows.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No stories yet." : "Belum ada cerita."}
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
              <Th>{t.content.theme}</Th>
              <Th>{t.content.colAge}</Th>
              <Th numeric>{t.content.colPages}</Th>
              <Th>{t.content.colStatus}</Th>
              <Th>{t.content.colUpdated}</Th>
            </tr>
          }
          footer={`${fmtNumber(rows.length)} ${t.common.rows}`}
        >
          {rows.map((row) => {
            const tr =
              row.story_translations.find((r) => r.locale === locale) ??
              row.story_translations.find((r) => r.locale === "id");
            const pageCount = tr ? parsePages(tr.pages).length : 0;
            // Both locales are mandatory, so a row with one is incomplete.
            const incomplete = row.story_translations.length < 2;

            return (
              <tr key={row.id} className="transition-colors hover:bg-black/[0.015]">
                <Td className="font-mono text-[0.8125rem] text-ink-faint">{row.id}</Td>
                <Td>
                  <Link
                    href={adminHref(locale, "stories", row.id)}
                    className="font-medium hover:text-sage-dark hover:underline"
                  >
                    {tr?.title ?? row.id}
                  </Link>
                  <span className="mt-0.5 flex flex-wrap gap-1.5">
                    {row.is_interactive ? (
                      <span className="text-meta rounded-pill bg-sage-soft px-2 py-0.5 text-sage-dark">
                        {t.content.interactive}
                      </span>
                    ) : null}
                    {incomplete ? (
                      <span className="text-meta rounded-pill bg-terracotta-soft px-2 py-0.5 text-[#8f4f38]">
                        {locale === "en" ? "One language only" : "Baru satu bahasa"}
                      </span>
                    ) : null}
                  </span>
                </Td>
                <Td className="text-ink-muted">{row.theme}</Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {row.age_min_months}–{row.age_max_months}
                </Td>
                <Td numeric className="text-ink-muted">
                  {pageCount}
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
