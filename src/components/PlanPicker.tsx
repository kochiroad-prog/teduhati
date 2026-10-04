"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { startCheckout } from "@/lib/checkout-actions";
import { formatRupiah } from "@/lib/entitlements";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const COPY = {
  id: {
    monthly: "Bulanan",
    yearly: "Tahunan",
    save: "Hemat 2 bulan",
    go: "Lanjut ke pembayaran",
    unavailable:
      "Pembayaran belum aktif. Rekening tujuan belum diisi oleh tim.",
  },
  en: {
    monthly: "Monthly",
    yearly: "Yearly",
    save: "Two months free",
    go: "Continue to payment",
    unavailable:
      "Payments aren't switched on yet. The team hasn't set a receiving account.",
  },
} as const;

/**
 * Prices and whether checkout works at all come in as props.
 *
 * Both now live in `app_settings`, which only the server can read, so this
 * component is told rather than asked. That is also what stops a stale bundle
 * showing yesterday's price after an admin changes one.
 */
export function PlanPicker({
  locale,
  prices,
  canPay,
}: {
  locale: Locale;
  prices: { premium: number; annual: number };
  canPay: boolean;
}) {
  const t = COPY[locale];
  const [plan, setPlan] = useState<"premium" | "annual">("premium");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(data: FormData) {
    start(async () => {
      const result = await startCheckout(data);
      if (result && !result.ok) setError(result.message);
    });
  }

  return (
    <form action={submit} className="mt-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="plan" value={plan} />

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["premium", t.monthly, formatRupiah(prices.premium), null],
            ["annual", t.yearly, formatRupiah(prices.annual), t.save],
          ] as const
        ).map(([key, label, price, note]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPlan(key)}
            aria-pressed={plan === key}
            className={cn(
              "rounded-[16px] border px-3 py-3 text-left transition-colors",
              plan === key
                ? "border-sage-dark bg-white"
                : "border-line bg-white/60 hover:border-sage",
            )}
          >
            <span className="text-meta block text-ink-muted">{label}</span>
            <span className="text-section mt-0.5 block">{price}</span>
            {note ? <span className="text-meta mt-0.5 block text-sage-dark">{note}</span> : null}
          </button>
        ))}
      </div>

      {error ? <p className="text-small mt-3 text-terracotta">{error}</p> : null}
      {!canPay ? <p className="text-small mt-3 text-ink-muted">{t.unavailable}</p> : null}

      <Button type="submit" size="lg" disabled={pending || !canPay} className="mt-4 w-full">
        {pending ? "…" : t.go}
      </Button>
    </form>
  );
}
