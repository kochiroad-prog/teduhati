/**
 * What each plan includes.
 *
 * Numbers come straight from the business plan. Keeping them in one object
 * means the paywall, the counters and the plans page can never drift apart.
 */

export type PlanTier = "free" | "premium" | "annual";

export type Entitlements = {
  children: number;
  activitiesPerDay: number | null;
  storiesPerMonth: number | null;
  aiQuestionsPerMonth: number | null;
  worksheets: boolean;
  fullMusicLibrary: boolean;
};

export const PLANS: Record<PlanTier, Entitlements> = {
  free: {
    children: 1,
    activitiesPerDay: 1,
    storiesPerMonth: 5,
    aiQuestionsPerMonth: 5,
    worksheets: false,
    fullMusicLibrary: false,
  },
  premium: {
    children: 3,
    activitiesPerDay: null,
    storiesPerMonth: null,
    aiQuestionsPerMonth: null,
    worksheets: true,
    fullMusicLibrary: true,
  },
  annual: {
    children: 3,
    activitiesPerDay: null,
    storiesPerMonth: null,
    aiQuestionsPerMonth: null,
    worksheets: true,
    fullMusicLibrary: true,
  },
};

export const PRICING = {
  premium: { amount: 39_000, period: "month" as const, currency: "IDR" },
  annual: { amount: 249_000, period: "year" as const, currency: "IDR" },
};

export function isPremium(plan: PlanTier): boolean {
  return plan === "premium" || plan === "annual";
}

export function entitlements(plan: PlanTier): Entitlements {
  return PLANS[plan] ?? PLANS.free;
}

/** null limit means unlimited, so anything is still within it. */
export function withinLimit(used: number, limit: number | null): boolean {
  return limit === null || used < limit;
}

export function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}
