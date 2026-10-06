import { notFound } from "next/navigation";
import Link from "next/link";
import { FilterBar } from "@/components/admin/FilterBar";
import {
  PageHead,
  Stat,
  TableFrame,
  Td,
  Th,
  fmtNumber,
} from "@/components/admin/parts";
import { Card, EmptyState, Notice } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { adminHref } from "@/lib/admin/routes";
import { createClient } from "@/lib/supabase/server";
import { formatAge } from "@/lib/age";
import { getDictionary } from "@/i18n/dictionaries";
import type {
  PreviewActivity,
  PreviewBonding,
  PreviewCounts,
  PreviewStory,
  PreviewWorksheet,
} from "@/types/db";

/**
 * "Show me the app at this age."
 *
 * An admin cannot judge the library by reading tables: the real question is what
 * a parent of a two-year-old actually finds. This answers it without creating a
 * fake child profile, which would pollute the figures on every other screen.
 *
 * What it shows is the FIRST-DAY view. `recommend_activities` ranks against a
 * child's history — domains already played, activities already done, interests
 * the parent listed — and an age on its own has none of that. For a brand-new
 * child every one of those terms is zero, so this is exactly the first
 * impression the product makes, and it is labelled as such rather than passed
 * off as the personalised ranking.
 */

export const dynamic = "force-dynamic";

/**
 * Stops at 59 months, not 72.
 *
 * The tables allow up to 72 because that was headroom, but `age_bands` ends at
 * m48_60 and the product is "0–5 tahun". Asking the preview about 66 months
 * returns nothing and no band — correct, but offering the option would suggest
 * a gap in the library rather than the edge of the product.
 */
const MONTH_OPTIONS = [1, 2, 4, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 59];

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ bulan?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);
  const dict = getDictionary(locale);

  const sp = await searchParams;
  const parsed = Number.parseInt(sp.bulan ?? "", 10);
  const months = Number.isFinite(parsed) && parsed >= 0 && parsed <= 72 ? parsed : 24;

  const supabase = await createClient();
  const [
    { data: countsRaw },
    { data: activitiesRaw },
    { data: bondingRaw },
    { data: storiesRaw },
    { data: worksheetsRaw },
  ] = await Promise.all([
    supabase.rpc("admin_preview_counts", { p_months: months }),
    supabase.rpc("admin_preview_activities", {
      p_months: months,
      p_locale: locale,
      p_limit: 24,
    }),
    supabase.rpc("admin_preview_bonding", { p_months: months, p_locale: locale }),
    supabase.rpc("admin_preview_stories", { p_months: months, p_locale: locale }),
    supabase.rpc("admin_preview_worksheets", { p_months: months, p_locale: locale }),
  ]);

  const counts = (countsRaw ?? null) as PreviewCounts | null;
  const activities = (activitiesRaw ?? []) as PreviewActivity[];
  const bonding = (bondingRaw ?? []) as PreviewBonding[];
  const stories = (storiesRaw ?? []) as PreviewStory[];
  const worksheets = (worksheetsRaw ?? []) as PreviewWorksheet[];

  const freeActivities = counts?.activities_free ?? 0;

  return (
    <div className="space-y-8">
      <PageHead
        title={t.preview.title}
        lead={t.preview.lead}
        action={
          <span className="text-meta text-ink-faint">
            {formatAge(months, dict)}
            {counts?.band ? ` · ${counts.band}` : ""}
          </span>
        }
      />

      <FilterBar
        action={adminHref(locale, "preview")}
        applyLabel={t.preview.show}
        selects={[
          {
            name: "bulan",
            label: t.preview.age,
            value: String(months),
            options: MONTH_OPTIONS.map((m) => ({
              value: String(m),
              label: formatAge(m, dict),
            })),
            allLabel: formatAge(24, dict),
          },
        ]}
      />

      {/* The holes are the useful part of this screen. */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label={t.content.activitiesTitle}
          value={fmtNumber(counts?.activities)}
          hint={`${fmtNumber(freeActivities)} ${t.content.freeOnly.toLowerCase()}`}
        />
        <Stat label={t.content.bondingTitle} value={fmtNumber(counts?.bonding)} />
        <Stat label={t.content.storiesTitle} value={fmtNumber(counts?.stories)} />
        <Stat label={t.content.worksheetsTitle} value={fmtNumber(counts?.worksheets)} />
        <Stat
          label={t.preview.band}
          value={counts?.band ?? t.common.none}
        />
      </section>

      {freeActivities === 0 && (counts?.activities ?? 0) > 0 ? (
        <Notice tone="care" title={t.preview.allPremiumTitle}>
          {t.preview.allPremium}
        </Notice>
      ) : null}

      {(counts?.activities ?? 0) === 0 ? (
        <Notice tone="care" title={t.preview.emptyTitle}>
          {t.preview.empty}
        </Notice>
      ) : null}

      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-section mb-1">{t.content.activitiesTitle}</h2>
        <p className="text-small mb-3 text-ink-muted">{t.preview.firstDay}</p>
        {activities.length === 0 ? (
          <EmptyState title={t.preview.empty} lead="" />
        ) : (
          <TableFrame
            head={
              <tr>
                <Th>{t.content.colTitle}</Th>
                <Th>{t.content.colDomain}</Th>
                <Th>{t.content.colAge}</Th>
                <Th numeric>{t.content.colDuration}</Th>
                <Th>{t.content.filterPremium}</Th>
              </tr>
            }
            footer={`${fmtNumber(activities.length)} ${t.common.rows}`}
          >
            {activities.map((a) => (
              <tr key={a.activity_id}>
                <Td>
                  <Link
                    href={adminHref(locale, "activities", a.activity_id)}
                    className="font-medium hover:text-sage-dark hover:underline"
                  >
                    {a.title}
                  </Link>
                  <span className="text-meta mt-0.5 block max-w-[52ch] truncate text-ink-faint">
                    {a.summary}
                  </span>
                </Td>
                <Td className="text-ink-muted">{a.domain_name ?? a.primary_domain}</Td>
                <Td className="whitespace-nowrap text-ink-faint">
                  {a.age_min_months}–{a.age_max_months}
                </Td>
                <Td numeric className="text-ink-muted">
                  {a.duration_minutes} {t.common.minutes}
                </Td>
                <Td>
                  {a.is_premium ? (
                    <span className="text-meta rounded-pill bg-[#fdf1d8] px-2 py-0.5 text-[#8a6a1f]">
                      {t.content.premiumOnly}
                    </span>
                  ) : (
                    <span className="text-meta text-ink-faint">{t.content.freeOnly}</span>
                  )}
                </Td>
              </tr>
            ))}
          </TableFrame>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="text-section mb-3">{t.content.bondingTitle}</h2>
          {bonding.length === 0 ? (
            <EmptyState title={t.preview.empty} lead="" />
          ) : (
            <div className="space-y-2.5">
              {bonding.map((b) => (
                <Card key={b.bonding_moment_id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-section">{b.title}</p>
                    <span className="text-meta shrink-0 text-ink-faint">
                      {b.duration_minutes} {t.common.minutes}
                    </span>
                  </div>
                  <p className="text-small mt-1.5 text-ink-muted">{b.prompt}</p>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-section mb-3">{t.content.storiesTitle}</h2>
          {stories.length === 0 ? (
            <EmptyState title={t.preview.empty} lead="" />
          ) : (
            <div className="space-y-2.5">
              {stories.map((s) => (
                <Card key={s.story_id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-section">{s.title}</p>
                    <span className="text-meta shrink-0 text-ink-faint">
                      {s.reading_minutes} {t.common.minutes}
                    </span>
                  </div>
                  <p className="text-small mt-1.5 text-ink-muted">{s.blurb}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-section mb-3">{t.content.worksheetsTitle}</h2>
        {worksheets.length === 0 ? (
          <EmptyState title={t.preview.empty} lead="" />
        ) : (
          <TableFrame
            head={
              <tr>
                <Th>{t.content.colTitle}</Th>
                <Th>{t.content.colDomain}</Th>
                <Th numeric>{t.content.colPages}</Th>
                <Th>{t.content.filterPremium}</Th>
              </tr>
            }
            footer={`${fmtNumber(worksheets.length)} ${t.common.rows}`}
          >
            {worksheets.map((w) => (
              <tr key={w.worksheet_id}>
                <Td>{w.title}</Td>
                <Td className="text-ink-muted">{w.primary_domain}</Td>
                <Td numeric className="text-ink-muted">
                  {w.page_count}
                </Td>
                <Td>
                  {w.is_premium ? (
                    <span className="text-meta rounded-pill bg-[#fdf1d8] px-2 py-0.5 text-[#8a6a1f]">
                      {t.content.premiumOnly}
                    </span>
                  ) : (
                    <span className="text-meta text-ink-faint">{t.content.freeOnly}</span>
                  )}
                </Td>
              </tr>
            ))}
          </TableFrame>
        )}
      </section>
    </div>
  );
}
