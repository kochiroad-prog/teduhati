"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Notice, Pill, Textarea } from "@/components/ui";
import { Tumi } from "@/components/Tumi";
import { confirmTransfer } from "@/lib/checkout-actions";
import { formatRupiahExact, ORDER_WINDOW_HOURS } from "@/lib/payments";
import type { Locale } from "@/i18n/config";
import type { OrderRow } from "@/types/db";

/**
 * Bank-transfer payment.
 *
 * The amount carries a three-digit suffix so one transfer maps to one order
 * without relying on a payment note, which Indonesian banks often truncate. The
 * parent confirms they have sent it; an admin checks the account and approves.
 * Nothing here grants access by itself.
 */

const COPY = {
  id: {
    step1: "Transfer tepat sejumlah ini",
    step1Note:
      "Jumlahnya harus persis, termasuk tiga angka terakhir. Angka itulah yang menandai pesanan Anda.",
    step2: "Ke rekening",
    step3: "Lalu beri tahu kami",
    confirm: "Saya sudah transfer",
    noteLabel: "Catatan (opsional)",
    notePlaceholder: "Misalnya nama pengirim kalau berbeda dengan nama akun.",
    copied: "Tersalin",
    copy: "Salin",
    plan: "Paket",
    premium: "Premium bulanan",
    annual: "Premium tahunan",
    reference: "Nomor pesanan",
    expires: `Selesaikan dalam ${ORDER_WINDOW_HOURS} jam.`,
    waitingTitle: "Menunggu konfirmasi",
    waitingBody:
      "Terima kasih. Kami memeriksa transfernya dan mengaktifkan Premium Anda, biasanya dalam beberapa jam kerja.",
    paidTitle: "Premium aktif",
    paidBody: "Pembayaran sudah kami terima. Selamat menikmati seluruh isi TEDUHATI.",
    rejectedTitle: "Pembayaran belum cocok",
    rejectedBody:
      "Kami belum menemukan transfer yang cocok dengan pesanan ini. Hubungi kami kalau menurut Anda ini keliru.",
    expiredTitle: "Pesanan kedaluwarsa",
    expiredBody: "Batas waktunya lewat. Buat pesanan baru untuk melanjutkan.",
  },
  en: {
    step1: "Transfer exactly this amount",
    step1Note:
      "The amount must match to the last three digits. Those digits are what identify your order.",
    step2: "To this account",
    step3: "Then tell us",
    confirm: "I've made the transfer",
    noteLabel: "Note (optional)",
    notePlaceholder: "For example the sender's name, if it differs from your account name.",
    copied: "Copied",
    copy: "Copy",
    plan: "Plan",
    premium: "Premium monthly",
    annual: "Premium yearly",
    reference: "Order number",
    expires: `Complete this within ${ORDER_WINDOW_HOURS} hours.`,
    waitingTitle: "Waiting for confirmation",
    waitingBody:
      "Thank you. We'll check the transfer and switch Premium on, usually within a few working hours.",
    paidTitle: "Premium is active",
    paidBody: "Your payment arrived. Enjoy everything TEDUHATI has.",
    rejectedTitle: "We couldn't match a payment",
    rejectedBody:
      "We haven't found a transfer matching this order. Get in touch if you think that's wrong.",
    expiredTitle: "This order expired",
    expiredBody: "The time window passed. Start a new order to continue.",
  },
} as const;

function CopyRow({
  label,
  value,
  copyLabel,
  copiedLabel,
  big = false,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  big?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value.replace(/[^\d]/g, "") || value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused; the value is on screen to read anyway.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-meta text-ink-faint">{label}</p>
        <p className={big ? "font-display text-[1.75rem] leading-tight" : "text-section"}>
          {value}
        </p>
      </div>
      <Button tone="secondary" onClick={copy} className="shrink-0">
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}

export function PaymentPanel({
  locale,
  order,
  bank,
}: {
  locale: Locale;
  order: OrderRow;
  bank: { bank: string; accountNumber: string; accountName: string };
}) {
  const t = COPY[locale];
  const [status, setStatus] = useState(order.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(data: FormData) {
    start(async () => {
      const result = await confirmTransfer(data);
      if (result.ok) {
        setStatus("awaiting_confirmation");
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }

  const planLabel = order.plan === "annual" ? t.annual : t.premium;

  if (status === "paid") {
    return (
      <div className="pt-4 text-center">
        <Tumi state="celebrate" size={112} className="mx-auto" />
        <h2 className="text-title mt-4">{t.paidTitle}</h2>
        <p className="text-small mx-auto mt-2 max-w-[36ch] text-ink-muted">{t.paidBody}</p>
      </div>
    );
  }

  if (status === "awaiting_confirmation") {
    return (
      <div className="pt-4 text-center">
        <Tumi state="thinking" size={104} className="mx-auto" />
        <h2 className="text-title mt-4">{t.waitingTitle}</h2>
        <p className="text-small mx-auto mt-2 max-w-[38ch] text-ink-muted">{t.waitingBody}</p>
        <Card className="mt-6 text-left">
          <p className="text-meta text-ink-faint">{t.reference}</p>
          <p className="text-section mt-1">{order.reference}</p>
        </Card>
      </div>
    );
  }

  if (status === "rejected" || status === "expired" || status === "cancelled") {
    const title = status === "rejected" ? t.rejectedTitle : t.expiredTitle;
    const body = status === "rejected" ? t.rejectedBody : t.expiredBody;
    return (
      <div className="pt-4">
        <Notice tone="care" title={title}>
          {body}
          {order.review_note ? ` — ${order.review_note}` : ""}
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-meta text-ink-faint">{t.plan}</p>
            <p className="text-section mt-0.5">{planLabel}</p>
          </div>
          <Pill>{order.reference}</Pill>
        </div>
      </Card>

      <Card>
        <p className="text-meta text-sage-dark">1 — {t.step1}</p>
        <CopyRow
          label=""
          value={formatRupiahExact(order.total)}
          copyLabel={t.copy}
          copiedLabel={t.copied}
          big
        />
        <p className="text-small text-ink-muted">{t.step1Note}</p>
      </Card>

      <Card>
        <p className="text-meta text-sage-dark">2 — {t.step2}</p>
        <div className="mt-1 divide-y divide-line">
          <CopyRow
            label={bank.bank || "—"}
            value={bank.accountNumber || "—"}
            copyLabel={t.copy}
            copiedLabel={t.copied}
          />
        </div>
        <p className="text-small mt-1 text-ink-muted">{bank.accountName}</p>
      </Card>

      <form action={submit} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="order_id" value={order.id} />

        <Card>
          <p className="text-meta text-sage-dark">3 — {t.step3}</p>
          <div className="mt-3">
            <Field label={t.noteLabel} htmlFor="payer_note">
              <Textarea
                id="payer_note"
                name="payer_note"
                maxLength={300}
                placeholder={t.notePlaceholder}
              />
            </Field>
          </div>
        </Card>

        {error ? <p className="text-small text-terracotta">{error}</p> : null}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "…" : t.confirm}
        </Button>
        <p className="text-small text-center text-ink-faint">{t.expires}</p>
      </form>
    </div>
  );
}
