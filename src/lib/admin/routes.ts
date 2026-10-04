import type { Locale } from "@/i18n/config";

/**
 * Console routes.
 *
 * Indonesian segments for both locales, the same rule the parent-facing app
 * follows: the URL is part of the product, not a translated string.
 */
export const ADMIN = {
  overview: "",
  activities: "konten/aktivitas",
  stories: "konten/cerita",
  bonding: "konten/bonding",
  worksheets: "konten/lembar-kerja",
  audio: "konten/audio",
  users: "pengguna",
  orders: "pesanan",
  subscriptions: "langganan",
  settings: "pengaturan",
  audit: "jejak",
} as const;

export type AdminRoute = keyof typeof ADMIN;

export function adminHref(locale: Locale, route: AdminRoute, ...rest: string[]) {
  return ["", locale, "admin", ADMIN[route], ...rest].filter(Boolean).join("/");
}
