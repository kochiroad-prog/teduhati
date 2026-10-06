import Link from "next/link";
import { notFound } from "next/navigation";
import { FilterBar } from "@/components/admin/FilterBar";
import {
  PageHead,
  StatusBadge,
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
import { getTaxonomy } from "@/lib/admin/taxonomy";
import { createClient } from "@/lib/supabase/server";
import type { ActivityRow, ContentStatus } from "@/types/db";

/**
 * The activity library.
 *
 * Five hundred rows is the target, so the list is paged and filtered in SQL
 * rather than fetched whole and sieved in the browser. The filters live in the
 * query string, which is what lets the overview's action list link straight to
 * "published activities missing a safety note".
 */

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

const STATUSES: ContentStatus[] = ["draft", "review", "published", "retired"];

export default async function ActivitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    band?: string;
    domain?: string;
    status?: string;
    access?: string;
    page?: string;
  }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const band = sp.band ?? "";
  const domain = sp.domain ?? "";
  const status = sp.status ?? "";
  const access = sp.access ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const taxonomy = await getTaxonomy(locale);

  // One query, with the title joined in the console's own language so searching
  // for a title and reading the list use the same text.
  let query = supabase
    .from("activities")
    .select(
      "id, age_min_months, age_max_months, age_band_code, primary_domain, duration_minutes, status, is_premium, materials, updated_at, activity_translations!inner(title, locale, safety_notes)",
      { count: "exact" },
    )
    .eq("activity_translations.locale", locale);

  if (band) query = query.eq("age_band_code", band);
  if (domain) query = query.eq("primary_domain", domain);
  if (status && (STATUSES as string[]).includes(status)) {
    query = query.eq("status", status as ContentStatus);
  }
  if (access === "premium") query = query.eq("is_premium", true);
  if (access === "free") query = query.eq("is_premium", false);
  // PostgREST cannot `or` across a table and its embedded resource in one
  // filter, so the search used to pick a side: ids or titles, never both. SQL
  // has no such limit, so the matching happens there and comes back as a list
  // of ids. One extra round trip buys a search that behaves the way anyone
  // would expect — id, title and summary at once.
  if (q) {
    const { data: ids } = await supabase.rpc("admin_search_activity_ids", {
      p_q: q,
      p_locale: locale,
    });
    // An empty array is a real answer: nothing matched. `.in` with it returns
    // no rows, which is correct — falling back to "show everything" would be
    // the opposite of what was asked.
    query = query.in("id", (ids ?? []) as string[]);
  }

  const { data, count, error } = await query
    .order("id", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  type Joined = Pick<
    ActivityRow,
    | "id"
    | "age_min_months"
    | "age_max_months"
    | "age_band_code"
    | "primary_domain"
    | "duration_minutes"
    | "status"
    | "is_premium"
    | "materials"
    | "updated_at"
  > & {
    activity_translations: { title: string; locale: string; safety_notes: string | null }[];
  };

  const rows = (data ?? []) as unknown as Joined[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const domainLabel = new Map(taxonomy.domains.map((d) => [d.value, d.label]));
  const bandLabel = new Map(taxonomy.ageBands.map((b) => [b.value, b.label]));

  const listHref = adminHref(locale, "activities");

  function pageHref(n: number): string {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (band) qs.set("band", band);
    if (domain) qs.set("domain", domain);
    if (status) qs.set("status", status);
    if (access) qs.set("access", access);
    if (n > 1) qs.set("page", String(n));
    const s = qs.toString();
    return s ? `${listHref}?${s}` : listHref;
  }

  return (
    <div>
      <PageHead
        title={t.content.activitiesTitle}
        lead={t.content.lead}
        action={
          <ButtonLink href={adminHref(locale, "activities", "baru")}>
            {t.content.newActivity}
          </ButtonLink>
        }
      />

      <FilterBar
        action={listHref}
        search={q}
        searchLabel={t.common.search}
        searchPlaceholder={t.common.searchPlaceholder}
        applyLabel={t.common.search}
        selects={[
          {
            name: "band",
            label: t.content.filterAge,
            value: band,
            options: taxonomy.ageBands,
            allLabel: t.common.all,
          },
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
          {
            name: "access",
            label: t.content.filterPremium,
            value: access,
            options: [
              { value: "premium", label: t.content.premiumOnly },
              { value: "free", label: t.content.freeOnly },
            ],
            allLabel: t.common.all,
          },
        ]}
      />

      {error ? (
        <EmptyState title={error.message} lead="" />
      ) : rows.length === 0 ? (
        <EmptyState title={t.common.noResults} lead={t.common.noResultsLead} />
      ) : (
        <TableFrame
          head={
            <tr>
              <Th className="w-[6.5rem]">ID</Th>
              <Th>{t.content.colTitle}</Th>
              <Th>{t.content.colDomain}</Th>
              <Th>{t.content.colAge}</Th>
              <Th numeric>{t.content.colDuration}</Th>
              <Th>{t.content.colStatus}</Th>
              <Th>{t.content.colUpdated}</Th>
            </tr>
          }
          footer={
            <div className="flex items-center justify-between gap-4">
              <span>
                {fmtNumber(total)} {t.common.rows}
              </span>
              {pages > 1 ? (
                <span className="flex items-center gap-3">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)} className="text-sage-dark hover:underline">
                      &larr;
                    </Link>
                  ) : null}
                  <span>
                    {page} {t.common.of} {pages}
                  </span>
                  {page < pages ? (
                    <Link href={pageHref(page + 1)} className="text-sage-dark hover:underline">
                      &rarr;
                    </Link>
                  ) : null}
                </span>
              ) : null}
            </div>
          }
        >
          {rows.map((row) => {
            const tr = row.activity_translations[0];
            // Flagged inline, so the problem is visible in the list rather than
            // only after opening the row.
            const needsSafety =
              (row.materials.length > 0 || row.age_min_months < 12) &&
              !tr?.safety_notes?.trim();

            return (
              <tr key={row.id} className="transition-colors hover:bg-black/[0.015]">
                <Td className="font-mono text-[0.8125rem] text-ink-faint">{row.id}</Td>
                <Td>
                  <Link
                    href={adminHref(locale, "activities", row.id)}
                    className="font-medium hover:text-sage-dark hover:underline"
                  >
                    {tr?.title ?? row.id}
                  </Link>
                  <span className="mt-0.5 flex flex-wrap gap-1.5">
                    {row.is_premium ? (
                      <span className="text-meta rounded-pill bg-[#fdf1d8] px-2 py-0.5 text-[#8a6a1f]">
                        {t.content.premiumOnly}
                      </span>
                    ) : null}
                    {needsSafety ? (
                      <span className="text-meta rounded-pill bg-terracotta-soft px-2 py-0.5 text-[#8f4f38]">
                        {t.content.safety}
                      </span>
                    ) : null}
                  </span>
                </Td>
                <Td className="text-ink-muted">
                  {domainLabel.get(row.primary_domain) ?? row.primary_domain}
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {row.age_min_months}–{row.age_max_months}
                  <span className="text-meta ml-1 text-ink-faint">
                    {bandLabel.get(row.age_band_code)?.split(" (")[0] ?? ""}
                  </span>
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
