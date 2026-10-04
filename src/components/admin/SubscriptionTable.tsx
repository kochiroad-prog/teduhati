"use client";

import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/ui";
import { TableFrame, Td, Th, fmtDate, fmtNumber } from "@/components/admin/parts";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { cancelSubscription, grantPremium } from "@/lib/admin-actions";
import type { SubscriptionRow } from "@/types/db";
import { cn } from "@/lib/utils";

/**
 * Subscriptions.
 *
 * Extending reuses `grant_premium` rather than writing a date directly: the
 * function already handles the one-active-subscription rule and records an audit
 * entry, and a second code path that sets `expires_at` by hand would eventually
 * disagree with it.
 *
 * Cancelling is confirmed in place. It takes away access someone has paid for,
 * so it should not be one stray click.
 */

const STATUS_STYLE: Record<string, string> = {
  active: "bg-sage-soft text-sage-dark",
  trialing: "bg-[#fdf1d8] text-[#8a6a1f]",
  past_due: "bg-terracotta-soft text-[#8f4f38]",
  canceled: "bg-black/[0.055] text-ink-faint",
  expired: "bg-black/[0.055] text-ink-faint",
};

export function SubscriptionTable({
  locale,
  rows,
  names,
  canManage,
  nowMs,
}: {
  locale: Locale;
  rows: SubscriptionRow[];
  names: Record<string, string | null>;
  canManage: boolean;
  /**
   * The request's clock, passed in rather than read here. Rendering must not
   * depend on Date.now(): the same props would then produce different output on
   * a re-render, and "expires soon" would flicker.
   */
  nowMs: number;
}) {
  const t = adminCopy(locale);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function extend(row: SubscriptionRow) {
    const data = new FormData();
    data.set("locale", locale);
    data.set("user_id", row.user_id);
    data.set("plan", row.plan === "annual" ? "annual" : "premium");
    data.set("months", "1");
    start(async () => {
      const r = await grantPremium(data);
      setMessage({ ok: r.ok, text: r.ok ? t.common.saved : r.message });
    });
  }

  function stop(id: string) {
    const data = new FormData();
    data.set("locale", locale);
    data.set("subscription_id", id);
    start(async () => {
      const r = await cancelSubscription(data);
      setMessage({ ok: r.ok, text: r.ok ? t.common.saved : r.message });
      setConfirming(null);
    });
  }

  return (
    <div className="space-y-4">
      {message ? (
        <Notice tone={message.ok ? "neutral" : "care"}>{message.text}</Notice>
      ) : null}

      <TableFrame
        head={
          <tr>
            <Th>{t.orders.colParent}</Th>
            <Th>{t.subscriptions.colPlan}</Th>
            <Th>{t.subscriptions.colStatus}</Th>
            <Th>{t.subscriptions.colStarted}</Th>
            <Th>{t.subscriptions.colExpires}</Th>
            <Th>{t.subscriptions.colProvider}</Th>
            <Th />
          </tr>
        }
        footer={`${fmtNumber(rows.length)} ${t.common.rows}`}
      >
        {rows.map((row) => {
          const expiring =
            row.expires_at !== null &&
            new Date(row.expires_at).getTime() - nowMs < 7 * 24 * 3600 * 1000;

          return (
            <tr key={row.id}>
              <Td>{names[row.user_id] ?? t.common.none}</Td>
              <Td className="text-ink-muted">{row.plan}</Td>
              <Td>
                <span
                  className={cn(
                    "text-meta rounded-pill px-2.5 py-1",
                    STATUS_STYLE[row.status] ?? STATUS_STYLE.expired,
                  )}
                >
                  {row.status}
                </span>
              </Td>
              <Td className="whitespace-nowrap text-ink-faint">
                {fmtDate(row.started_at, locale)}
              </Td>
              <Td
                className={cn(
                  "whitespace-nowrap",
                  expiring && row.status === "active" ? "text-terracotta" : "text-ink-faint",
                )}
              >
                {fmtDate(row.expires_at, locale)}
              </Td>
              <Td className="text-ink-faint">{row.provider ?? t.common.none}</Td>
              <Td>
                {canManage ? (
                  confirming === row.id ? (
                    <span className="flex items-center gap-2">
                      <Button tone="danger" onClick={() => stop(row.id)} disabled={pending}>
                        {t.subscriptions.cancel}
                      </Button>
                      <Button tone="quiet" onClick={() => setConfirming(null)}>
                        {t.common.cancel}
                      </Button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Button
                        tone="secondary"
                        onClick={() => extend(row)}
                        disabled={pending}
                      >
                        {t.subscriptions.extend}
                      </Button>
                      {row.status === "active" || row.status === "trialing" ? (
                        <Button tone="quiet" onClick={() => setConfirming(row.id)}>
                          {t.subscriptions.cancel}
                        </Button>
                      ) : null}
                    </span>
                  )
                ) : null}
              </Td>
            </tr>
          );
        })}
      </TableFrame>
    </div>
  );
}
