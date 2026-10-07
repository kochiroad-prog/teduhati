import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTrend } from "@/components/AdminTrend";
import {
  Delta,
  PageHead,
  Stat,
  Td,
  TableFrame,
  Th,
  fmtDate,
  fmtNumber,
  fmtRupiah,
} from "@/components/admin/parts";
import { Card, Notice } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { adminHref } from "@/lib/admin/routes";
import { createClient } from "@/lib/supabase/server";
import type {
  IllustrationCoverage,
  AdminDailyRow,
  AdminDomainCoverage,
  AdminFunnel,
  AdminOverview,
  AdminRevenueRow,
  AdminTopActivity,
  OrderRow,
} from "@/types/db";

/**
 * Ringkasan.
 *
 * Every figure here comes from a function in Postgres rather than a handful of
 * client queries, which is what keeps the page to one round trip per section and
 * stops two screens disagreeing about the same number.
 *
 * The action list at the top is the part that earns its place: it is the only
 * section that tells an admin to go and do something.
 */

export const dynamic = "force-dynamic";

const FUNNEL_ORDER = [
  "signed_up",
  "added_child",
  "did_one",
  "did_three",
  "started_order",
  "paid",
] as const;

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const supabase = await createClient();
  const [
    { data: overviewRaw },
    { data: dailyRaw },
    { data: funnelRaw },
    { data: topRaw },
    { data: coverageRaw },
    { data: revenueRaw },
    { data: ordersRaw },
    { data: illustrationRaw },
  ] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_daily", { p_days: 30 }),
    supabase.rpc("admin_funnel", { p_days: 30 }),
    supabase.rpc("admin_top_activities", { p_days: 30, p_limit: 8 }),
    supabase.rpc("admin_domain_coverage"),
    supabase.rpc("admin_revenue_monthly", { p_months: 6 }),
    supabase
      .from("orders")
      .select("*")
      .eq("status", "awaiting_confirmation")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.rpc("admin_illustration_coverage"),
  ]);

  const o = (overviewRaw ?? null) as AdminOverview | null;
  const daily = (dailyRaw ?? []) as AdminDailyRow[];
  const funnel = (funnelRaw ?? null) as AdminFunnel | null;
  const top = (topRaw ?? []) as AdminTopActivity[];
  const coverage = (coverageRaw ?? []) as AdminDomainCoverage[];
  const revenue = (revenueRaw ?? []) as AdminRevenueRow[];
  const orders = (ordersRaw ?? []) as OrderRow[];
  const art = (illustrationRaw ?? null) as IllustrationCoverage | null;

  // The action list. Each entry is a sentence plus the place to go and fix it,
  // which is the difference between a dashboard and a to-do list.
  const todo: { text: string; href: string }[] = [];
  if ((o?.orders_pending ?? 0) > 0) {
    todo.push({
      text: t.overview.todoOrders(o?.orders_pending ?? 0),
      href: adminHref(locale, "orders"),
    });
  }
  if (o && !o.bank_configured) {
    todo.push({ text: t.overview.todoBank, href: adminHref(locale, "settings") });
  }
  if ((o?.needs_safety_note ?? 0) > 0) {
    todo.push({
      text: t.overview.todoSafety(o?.needs_safety_note ?? 0),
      href: `${adminHref(locale, "activities")}?status=published`,
    });
  }
  if ((o?.missing_translation ?? 0) > 0) {
    todo.push({
      text: t.overview.todoTranslation(o?.missing_translation ?? 0),
      href: adminHref(locale, "activities"),
    });
  }
  if ((o?.audio_missing_file ?? 0) > 0) {
    todo.push({
      text: t.overview.todoAudio(o?.audio_missing_file ?? 0),
      href: adminHref(locale, "audio"),
    });
  }
  if ((art?.none ?? 0) > 0) {
    todo.push({
      text: t.overview.todoIllustration(art?.none ?? 0),
      href: adminHref(locale, "activities"),
    });
  }
  if ((o?.activities_draft ?? 0) > 0) {
    todo.push({
      text: t.overview.todoDraft(o?.activities_draft ?? 0),
      href: `${adminHref(locale, "activities")}?status=draft`,
    });
  }

  const funnelTop = funnel?.signed_up ?? 0;

  return (
    <div className="space-y-9">
      <PageHead title={t.overview.title} lead={t.overview.lead} />

      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-section mb-3">{t.overview.todo}</h2>
        {todo.length === 0 ? (
          <Notice>{t.overview.todoClear}</Notice>
        ) : (
          <Card className="divide-y divide-line p-0">
            {todo.map((item) => (
              <Link
                key={item.text}
                href={item.href}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-black/[0.02]"
              >
                <span className="text-small text-ink">{item.text}</span>
                <span aria-hidden="true" className="text-ink-faint">
                  &rarr;
                </span>
              </Link>
            ))}
          </Card>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t.overview.parents}
          value={fmtNumber(o?.parents)}
          hint={`+${fmtNumber(o?.signups_30d)} / 30d`}
        />
        <Stat
          label={t.overview.signups}
          value={fmtNumber(o?.signups_7d)}
          delta={<Delta now={o?.signups_7d ?? 0} before={o?.signups_prev_7d ?? 0} />}
        />
        <Stat label={t.overview.children} value={fmtNumber(o?.children)} />
        <Stat label={t.overview.activeSubs} value={fmtNumber(o?.active_subs)} />
        <Stat label={t.overview.mrr} value={fmtRupiah(o?.mrr)} />
        <Stat
          label={t.overview.revenue30}
          value={fmtRupiah(o?.revenue_30d)}
          delta={<Delta now={o?.revenue_30d ?? 0} before={o?.revenue_prev_30d ?? 0} />}
        />
        <Stat
          label={t.overview.completions}
          value={fmtNumber(o?.completions_7d)}
          delta={
            <Delta now={o?.completions_7d ?? 0} before={o?.completions_prev_7d ?? 0} />
          }
        />
        <Stat label={t.overview.aiQuestions} value={fmtNumber(o?.ai_questions_month)} />
      </section>

      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-section mb-3">{t.overview.trend}</h2>
        <AdminTrend
          data={daily}
          labels={{
            signups: t.overview.trendSignups,
            completions: t.overview.trendCompletions,
          }}
        />
      </section>

      {/* ----------------------------------------------------------------- */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="text-section mb-1">{t.overview.funnel}</h2>
          <p className="text-small mb-3 text-ink-muted">{t.overview.funnelLead}</p>
          <Card className="space-y-3">
            {FUNNEL_ORDER.map((key) => {
              const value = funnel?.[key] ?? 0;
              const share = funnelTop === 0 ? 0 : Math.round((value / funnelTop) * 100);
              return (
                <div key={key}>
                  <div className="text-small mb-1 flex items-baseline justify-between gap-3">
                    <span className="text-ink-muted">{t.overview.funnelSteps[key]}</span>
                    <span className="tabular-nums">
                      {fmtNumber(value)}
                      <span className="text-meta ml-1.5 text-ink-faint">{share}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-pill bg-black/[0.055]">
                    <div
                      className="h-full rounded-pill bg-sage transition-[width] duration-300"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        <div>
          <h2 className="text-section mb-1">{t.overview.coverage}</h2>
          <p className="text-small mb-3 text-ink-muted">{t.overview.coverageLead}</p>
          <TableFrame
            head={
              <tr>
                <Th>{t.content.colDomain}</Th>
                <Th numeric>{t.overview.coveragePublished}</Th>
                <Th numeric>{t.overview.coverageUsed}</Th>
              </tr>
            }
          >
            {coverage.map((row) => (
              <tr key={row.domain_code}>
                <Td>{row.name ?? row.domain_code}</Td>
                <Td numeric>{fmtNumber(row.published)}</Td>
                <Td numeric className={row.completions === 0 ? "text-ink-faint" : undefined}>
                  {fmtNumber(row.completions)}
                </Td>
              </tr>
            ))}
          </TableFrame>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="text-section mb-1">{t.overview.topActivities}</h2>
          <p className="text-small mb-3 text-ink-muted">{t.overview.topActivitiesLead}</p>
          <TableFrame
            head={
              <tr>
                <Th>{t.content.colTitle}</Th>
                <Th numeric>{t.overview.coverageUsed}</Th>
              </tr>
            }
          >
            {top.map((row) => (
              <tr key={row.activity_id}>
                <Td>
                  <Link
                    href={adminHref(locale, "activities", row.activity_id)}
                    className="hover:text-sage-dark hover:underline"
                  >
                    {row.title}
                  </Link>
                  <span className="text-meta ml-2 text-ink-faint">{row.activity_id}</span>
                </Td>
                <Td numeric>{fmtNumber(row.completions)}</Td>
              </tr>
            ))}
          </TableFrame>
        </div>

        <div>
          <h2 className="text-section mb-3">{t.orders.revenue}</h2>
          <TableFrame
            head={
              <tr>
                <Th>{t.orders.colCreated}</Th>
                <Th numeric>{t.orders.title}</Th>
                <Th numeric>{t.overview.revenue30}</Th>
              </tr>
            }
          >
            {revenue.map((row) => (
              <tr key={row.month}>
                <Td>{fmtDate(row.month, locale)}</Td>
                <Td numeric>{fmtNumber(row.orders)}</Td>
                <Td numeric>{fmtRupiah(row.revenue)}</Td>
              </tr>
            ))}
          </TableFrame>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {orders.length > 0 ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="text-section">{t.overview.pending}</h2>
            <Link
              href={adminHref(locale, "orders")}
              className="text-meta text-sage-dark hover:underline"
            >
              {t.orders.title} &rarr;
            </Link>
          </div>
          <TableFrame
            head={
              <tr>
                <Th>{t.orders.colRef}</Th>
                <Th>{t.orders.colPlan}</Th>
                <Th numeric>{t.orders.colTotal}</Th>
                <Th>{t.orders.colCreated}</Th>
              </tr>
            }
          >
            {orders.map((order) => (
              <tr key={order.id}>
                <Td className="font-mono text-[0.875rem]">{order.reference}</Td>
                <Td>{order.plan}</Td>
                <Td numeric>{fmtRupiah(order.total)}</Td>
                <Td>{fmtDate(order.created_at, locale)}</Td>
              </tr>
            ))}
          </TableFrame>
        </section>
      ) : null}

      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-section mb-1">{t.overview.illustration}</h2>
        <p className="text-small mb-3 text-ink-muted">{t.overview.illustrationLead}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat
            label={t.overview.artFiles}
            value={fmtNumber(art?.files)}
            hint={`${fmtNumber(art?.domains_covered)}/${fmtNumber(art?.domains_total)} ${t.content.colDomain.toLowerCase()}`}
          />
          <Stat label={t.overview.artSpecific} value={fmtNumber(art?.specific)} />
          <Stat label={t.overview.artBand} value={fmtNumber(art?.band)} />
          <Stat label={t.overview.artDomain} value={fmtNumber(art?.domain)} />
          <Stat
            label={t.overview.artNone}
            value={fmtNumber(art?.none)}
            hint={(art?.none ?? 0) > 0 ? t.overview.artNoneHint : undefined}
          />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t.content.activitiesTitle}
          value={fmtNumber(o?.activities_published)}
          hint={`${fmtNumber(o?.activities_total)} ${t.common.rows}`}
        />
        <Stat
          label={t.content.storiesTitle}
          value={fmtNumber(o?.stories_published)}
          hint={`${fmtNumber(o?.stories_total)} ${t.common.rows}`}
        />
        <Stat
          label={t.content.bondingTitle}
          value={fmtNumber(o?.bonding_published)}
          hint={`${fmtNumber(o?.bonding_total)} ${t.common.rows}`}
        />
        <Stat
          label={t.content.audioTitle}
          value={fmtNumber(o?.audio_total)}
          hint={
            (o?.audio_missing_file ?? 0) > 0
              ? t.overview.todoAudio(o?.audio_missing_file ?? 0)
              : undefined
          }
        />
      </section>

      <p className="text-meta text-ink-faint">{t.content.lead}</p>
    </div>
  );
}
