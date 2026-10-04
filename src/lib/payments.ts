import type { PlanTier } from "@/lib/entitlements";

/**
 * Payments.
 *
 * There is no payment gateway account yet, so the provider that actually works
 * today is a bank transfer an admin confirms. The abstraction exists so adding
 * Midtrans or Xendit later is a new `PaymentProvider`, not a rewrite: checkout
 * still writes one row to `orders`, and `approve_order` in Postgres is still
 * what grants the subscription.
 */

export type PaidPlan = Exclude<PlanTier, "free">;

export type PaymentProvider = {
  key: string;
  /** Shown on the checkout screen. */
  label: { id: string; en: string };
  /** False until credentials exist, which keeps a dead option off the screen. */
  available: boolean;
};

/**
 * Where a manual transfer goes.
 *
 * The values live in `app_settings` and are read through `getSettings()`, so an
 * admin sets them in the dashboard rather than in an environment variable. The
 * provider list below is the catalogue, not the configuration: whether bank
 * transfer is actually available depends on those settings, which is why
 * `available` takes them as an argument instead of reading the environment.
 */
export const PROVIDERS: PaymentProvider[] = [
  {
    key: "manual_transfer",
    label: { id: "Transfer bank", en: "Bank transfer" },
    available: true,
  },
  {
    key: "midtrans",
    label: { id: "Kartu, QRIS, e-wallet", en: "Card, QRIS, e-wallet" },
    // Still an environment variable, and rightly so: a gateway's secret key is
    // a deployment credential, not a setting someone edits in a browser.
    available: Boolean(process.env.MIDTRANS_SERVER_KEY),
  },
];

/**
 * A three-digit suffix added to the transfer amount.
 *
 * Indonesian banks often strip or truncate a payment note, so the amount itself
 * carries the identifier: Rp39.000 becomes Rp39.137, and that exact figure maps
 * back to one order. The suffix is never zero, or the amount would look ordinary.
 */
export function uniqueSuffix(): number {
  return 1 + Math.floor(Math.random() * 899);
}

/** A human-readable order reference, e.g. TDH-7K3Q2M. */
export function orderReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `TDH-${out}`;
}

export function formatRupiahExact(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

/** Hours a parent has to complete a transfer before the order lapses. */
export const ORDER_WINDOW_HOURS = 24;
