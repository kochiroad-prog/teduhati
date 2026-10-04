import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { PLANS, PRICING } from "@/lib/entitlements";

/**
 * Settings an admin can change without a deploy.
 *
 * These used to be environment variables and constants: the bank account lived
 * in NEXT_PUBLIC_BANK_*, the prices in entitlements.ts. Both are now rows in
 * `app_settings`, because changing a price should not mean asking a developer.
 *
 * The constants stay as the fallback. A fresh database, a failed query or a
 * missing row all land on the same defaults rather than showing a parent a
 * price of zero.
 */

export type AppSettings = {
  bank: { name: string; accountNumber: string; accountHolder: string };
  price: { premium: number; annual: number };
  free: {
    children: number;
    activitiesPerDay: number;
    storiesPerMonth: number;
    aiQuestionsPerMonth: number;
  };
  orderWindowHours: number;
  features: {
    checkout: boolean;
    music: boolean;
    ai: boolean;
    worksheets: boolean;
  };
};

export const DEFAULT_SETTINGS: AppSettings = {
  bank: {
    // The env vars remain the fallback so an existing deployment keeps working
    // through the change. New values belong in the dashboard.
    name: process.env.NEXT_PUBLIC_BANK_NAME ?? "",
    accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "",
    accountHolder: process.env.NEXT_PUBLIC_BANK_HOLDER ?? "",
  },
  price: { premium: PRICING.premium.amount, annual: PRICING.annual.amount },
  free: {
    children: PLANS.free.children,
    activitiesPerDay: PLANS.free.activitiesPerDay ?? 1,
    storiesPerMonth: PLANS.free.storiesPerMonth ?? 5,
    aiQuestionsPerMonth: PLANS.free.aiQuestionsPerMonth ?? 5,
  },
  orderWindowHours: 24,
  features: { checkout: true, music: true, ai: true, worksheets: false },
};

/** The raw key/value shape `public_settings()` returns. */
export type SettingsRow = {
  key: string;
  value: unknown;
  is_public: boolean;
  label: string | null;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

function str(raw: Record<string, unknown>, key: string, fallback: string): string {
  const v = raw[key];
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function num(raw: Record<string, unknown>, key: string, fallback: number): number {
  const v = raw[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function bool(raw: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = raw[key];
  return typeof v === "boolean" ? v : fallback;
}

export function shapeSettings(raw: Record<string, unknown>): AppSettings {
  const d = DEFAULT_SETTINGS;
  return {
    bank: {
      name: str(raw, "bank.name", d.bank.name),
      accountNumber: str(raw, "bank.account_number", d.bank.accountNumber),
      accountHolder: str(raw, "bank.account_holder", d.bank.accountHolder),
    },
    price: {
      premium: num(raw, "price.premium", d.price.premium),
      annual: num(raw, "price.annual", d.price.annual),
    },
    free: {
      children: num(raw, "free.children", d.free.children),
      activitiesPerDay: num(raw, "free.activities_per_day", d.free.activitiesPerDay),
      storiesPerMonth: num(raw, "free.stories_per_month", d.free.storiesPerMonth),
      aiQuestionsPerMonth: num(
        raw,
        "free.ai_questions_per_month",
        d.free.aiQuestionsPerMonth,
      ),
    },
    orderWindowHours: num(raw, "order.window_hours", d.orderWindowHours),
    features: {
      checkout: bool(raw, "feature.checkout", d.features.checkout),
      music: bool(raw, "feature.music", d.features.music),
      ai: bool(raw, "feature.ai", d.features.ai),
      worksheets: bool(raw, "feature.worksheets", d.features.worksheets),
    },
  };
}

/**
 * One round trip per request, shared by every component that asks.
 *
 * `public_settings()` is granted to anon on purpose: the landing page shows a
 * price and the payment screen shows an account number, so both have to be
 * readable before anyone signs in. Nothing private is in that function's output.
 */
export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("public_settings");
    if (error || !data || typeof data !== "object") return DEFAULT_SETTINGS;
    return shapeSettings(data as Record<string, unknown>);
  } catch {
    return DEFAULT_SETTINGS;
  }
});

/** Checkout stays hidden until there is an account number to transfer to. */
export function checkoutAvailable(s: AppSettings): boolean {
  return (
    s.features.checkout &&
    Boolean(s.bank.name && s.bank.accountNumber && s.bank.accountHolder)
  );
}

export function planPrice(s: AppSettings, plan: "premium" | "annual"): number {
  return plan === "annual" ? s.price.annual : s.price.premium;
}
