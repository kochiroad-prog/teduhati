import { notFound } from "next/navigation";
import { AdminOrders } from "@/components/AdminOrders";
import { FilterBar } from "@/components/admin/FilterBar";
import {
  PageHead,
  QueryError,
  TableFrame,
  Td,
  Th,
  fmtDateTime,
  fmtNumber,
  fmtRupiah,
} from "@/components/admin/parts";
import { EmptyState, Notice } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { getAdminContext } from "@/lib/admin/guard";
import { adminHref } from "@/lib/admin/routes";
import { createClient } from "@/lib/supabase/server";
import type { AdminRevenueRow, OrderRow, OrderStatus, ProfileRow } from "@/types/db";
import { cn } from "@/lib/utils";

/**
 * Orders.
 *
 * Two parts, in the order they matter: the queue of transfers waiting to be
 * matched against the bank statement, then the full history. The amount is shown
 * exactly, suffix included — rounding it away destroys the only identifier a
 * truncated bank note leaves behind.
 */

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = [
  "awaiting_payment",
  "awaiting_confirmation",
  "paid",
  "rejected",
  "expired",
  "cancelled",
];

const STATUS_STYLE: Record<OrderStatus, string> = {
  paid: "bg-sage-soft text-sage-dark",
  awaiting_confirmation: "bg-[#fdf1d8] text-[#8a6a1f]",
  awaiting_payment: "bg-black/[0.055] text-ink-muted",
  rejected: "bg-terracotta-soft text-[#8f4f38]",
  expired: "bg-black/[0.055] text-ink-faint",
  cancelled: "bg-black/[0.055] text-ink-faint",
};

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const sp = await searchParams;
  const status = sp.status ?? "";

  const ctx = await getAdminContext();
  const supabase = await createClient();

  let history = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && (STATUSES as string[]).includes(status)) {
    history = history.eq("status", status as OrderStatus);
  }

  const [{ data: pendingRaw, error }, { data: historyRaw }, { data: revenueRaw }, { data: profileRaw }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .in("status", ["awaiting_confirmation", "awaiting_payment"])
        .order("created_at", { ascending: false })
        .limit(40),
      history,
      supabase.rpc("admin_revenue_monthly", { p_months: 12 }),
      supabase.from("profiles").select("id, display_name"),
    ]);

  const pending = (pendingRaw ?? []) as OrderRow[];
  const orders = (historyRaw ?? []) as OrderRow[];
  const revenue = (revenueRaw ?? []) as AdminRevenueRow[];
  const names = new Map(
    ((profileRaw ?? []) as Pick<ProfileRow, "id" | "display_name">[]).map((p) => [
      p.id,
      p.display_name,
    ]),
  );

  return (
    <div className="space-y-9">
      <PageHead title={t.orders.title} lead={t.orders.lead} />

      <QueryError error={error} locale={locale} />

      <Notice>{t.orders.suffixNote}</Notice>

      <section>
        <h2 className="text-section mb-3">{t.overview.pending}</h2>
        {pending.length === 0 ? (
          <EmptyState title={t.orders.empty} lead={t.orders.emptyLead} />
        ) : (
          <AdminOrders locale={locale} orders={pending} canReview={ctx.isAdmin} />
        )}
      </section>

      <section>
        <h2 className="text-section mb-3">{t.orders.title}</h2>

        <FilterBar
          action={adminHref(locale, "orders")}
          applyLabel={t.content.filterStatus}
          selects={[
            {
              name: "status",
              label: t.content.filterStatus,
              value: status,
              options: STATUSES.map((s) => ({ value: s, label: t.orders.statusLabels[s] })),
              allLabel: t.common.all,
            },
          ]}
        />

        {orders.length === 0 ? (
          <EmptyState title={t.common.noResults} lead={t.common.noResultsLead} />
        ) : (
          <TableFrame
            head={
              <tr>
                <Th>{t.orders.colRef}</Th>
                <Th>{t.orders.colParent}</Th>
                <Th>{t.orders.colPlan}</Th>
                <Th numeric>{t.orders.colTotal}</Th>
                <Th>{t.orders.colStatus}</Th>
                <Th>{t.orders.colCreated}</Th>
                <Th>{t.orders.colReviewed}</Th>
              </tr>
            }
            footer={`${fmtNumber(orders.length)} ${t.common.rows}`}
          >
            {orders.map((order) => (
              <tr key={order.id}>
                <Td className="font-mono text-[0.8125rem]">{order.reference}</Td>
                <Td className="text-ink-muted">
                  {names.get(order.user_id) ?? t.common.none}
                </Td>
                <Td className="text-ink-muted">{order.plan}</Td>
                <Td numeric>
                  {fmtRupiah(order.total)}
                  <span className="text-meta ml-1 block text-ink-faint">
                    {fmtRupiah(order.amount)} + {order.unique_suffix}
                  </span>
                </Td>
                <Td>
                  <span
                    className={cn(
                      "text-meta rounded-pill px-2.5 py-1",
                      STATUS_STYLE[order.status],
                    )}
                  >
                    {t.orders.statusLabels[order.status]}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-ink-faint">
                  {fmtDateTime(order.created_at, locale)}
                </Td>
                <Td className="whitespace-nowrap text-ink-faint">
                  {fmtDateTime(order.reviewed_at, locale)}
                  {order.review_note ? (
                    <span className="text-meta block max-w-[24ch] truncate">
                      {order.review_note}
                    </span>
                  ) : null}
                </Td>
              </tr>
            ))}
          </TableFrame>
        )}
      </section>

      <section>
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
              <Td>
                {new Date(row.month).toLocaleDateString(
                  locale === "en" ? "en-GB" : "id-ID",
                  { month: "long", year: "numeric" },
                )}
              </Td>
              <Td numeric>{fmtNumber(row.orders)}</Td>
              <Td numeric>{fmtRupiah(row.revenue)}</Td>
            </tr>
          ))}
        </TableFrame>
      </section>
    </div>
  );
}
