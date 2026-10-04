"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input, Pill } from "@/components/ui";
import { approveOrder, rejectOrder } from "@/lib/checkout-actions";
import { formatRupiahExact } from "@/lib/payments";
import type { Locale } from "@/i18n/config";
import type { OrderRow } from "@/types/db";

/**
 * The review queue.
 *
 * Approving is the only thing in the product that turns money into access, so it
 * is deliberately a two-step action with the exact amount shown next to it: the
 * reviewer matches the figure against the bank statement, then confirms.
 */

const COPY = {
  id: {
    approve: "Setujui",
    reject: "Tolak",
    confirmApprove: "Aktifkan Premium?",
    confirmReject: "Tolak pesanan ini?",
    cancel: "Batal",
    note: "Catatan (opsional)",
    awaitingConfirmation: "Perlu dicek",
    awaitingPayment: "Belum transfer",
    premium: "Bulanan",
    annual: "Tahunan",
    payerNote: "Catatan pengirim",
    done: "Selesai",
  },
  en: {
    approve: "Approve",
    reject: "Reject",
    confirmApprove: "Switch Premium on?",
    confirmReject: "Reject this order?",
    cancel: "Cancel",
    note: "Note (optional)",
    awaitingConfirmation: "Needs checking",
    awaitingPayment: "Not paid yet",
    premium: "Monthly",
    annual: "Yearly",
    payerNote: "Payer's note",
    done: "Done",
  },
} as const;

export function AdminOrders({
  locale,
  orders,
  canReview,
}: {
  locale: Locale;
  orders: OrderRow[];
  canReview: boolean;
}) {
  const t = COPY[locale];
  const [handled, setHandled] = useState<Record<string, "paid" | "rejected">>({});
  const [confirming, setConfirming] = useState<{ id: string; action: "approve" | "reject" } | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(id: string, action: "approve" | "reject") {
    const data = new FormData();
    data.set("locale", locale);
    data.set("order_id", id);
    if (note.trim()) data.set("note", note.trim());

    start(async () => {
      const result = await (action === "approve" ? approveOrder : rejectOrder)(data);
      if (result.ok) {
        setHandled((prev) => ({ ...prev, [id]: action === "approve" ? "paid" : "rejected" }));
        setConfirming(null);
        setNote("");
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-small text-terracotta">{error}</p> : null}

      {orders.map((order) => {
        const outcome = handled[order.id];
        const isConfirming = confirming?.id === order.id;

        return (
          <Card key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-section">{order.reference}</p>
                  <Pill>{order.plan === "annual" ? t.annual : t.premium}</Pill>
                  <Pill>
                    {order.status === "awaiting_confirmation"
                      ? t.awaitingConfirmation
                      : t.awaitingPayment}
                  </Pill>
                </div>
                <p className="font-display mt-2 text-[1.5rem] leading-none text-ink">
                  {formatRupiahExact(order.total)}
                </p>
                <p className="text-small mt-1 text-ink-faint">
                  {new Date(order.created_at).toLocaleString(
                    locale === "en" ? "en-GB" : "id-ID",
                  )}
                </p>
                {order.payer_note ? (
                  <p className="text-small mt-2 text-ink-muted">
                    {t.payerNote}: {order.payer_note}
                  </p>
                ) : null}
              </div>

              {outcome ? (
                <span className="text-meta rounded-pill bg-sage-soft px-3 py-1.5 text-sage-dark">
                  {outcome === "paid" ? t.approve : t.reject} · {t.done}
                </span>
              ) : canReview && !isConfirming ? (
                <div className="flex gap-2">
                  <Button
                    tone="secondary"
                    onClick={() => setConfirming({ id: order.id, action: "approve" })}
                  >
                    {t.approve}
                  </Button>
                  <Button
                    tone="danger"
                    onClick={() => setConfirming({ id: order.id, action: "reject" })}
                  >
                    {t.reject}
                  </Button>
                </div>
              ) : null}
            </div>

            {isConfirming ? (
              <div className="mt-4 rounded-[14px] border border-line bg-cream p-4">
                <p className="text-section">
                  {confirming.action === "approve" ? t.confirmApprove : t.confirmReject}
                </p>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t.note}
                  className="mt-3"
                />
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={() => run(order.id, confirming.action)}
                    disabled={pending}
                    tone={confirming.action === "approve" ? "primary" : "danger"}
                  >
                    {pending
                      ? "…"
                      : confirming.action === "approve"
                        ? t.approve
                        : t.reject}
                  </Button>
                  <Button
                    tone="quiet"
                    onClick={() => {
                      setConfirming(null);
                      setNote("");
                    }}
                  >
                    {t.cancel}
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
