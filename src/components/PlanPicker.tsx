"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { startCheckout } from "@/lib/checkout-actions";
import { formatRupiah, PRICING } from "@/lib/entitlements";
import { availableProviders } from "@/lib/payments";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const COPY = {
  id: {
    monthly: "Bulanan",
    yearly: "Tahunan",
    save: "Hemat 2 bulan",
    go: "Lanjut ke pembayaran",
    unavailable:
      "Pembayaran belum aktif. Rekening tujuan atau payment gateway belum diisi di environment.",
  },
  en: {
    monthly: "Monthly",
    yearly: "Yearly",
    save: "Two months free",
    go: "Continue to payment",
    unavailable:
      "Payments aren't switched on. No bank account or gateway is configured in the environment.",
  },
} as const;

export function PlanPicker({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const [plan, setPlan] = useState<"premium" | "annual">("premium");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // availableProviders() reads NEXT_PUBLIC_ values, so it is safe on the client.
  const canPay = availableProviders().length > 0;

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
            ["premium", t.monthly, formatRupiah(PRICING.premium.amount), null],
            ["annual", t.yearly, formatRupiah(PRICING.annual.amount), t.save],
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
