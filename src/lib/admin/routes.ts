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

/**
 * An absolute path into the console.
 *
 * The leading slash is written out, not produced by an empty first element.
 * It was `["", locale, …].filter(Boolean).join("/")` — and `filter(Boolean)`
 * drops that empty string, so every link came out relative: "id/admin/konten/
 * bonding" resolved against /id/ became /id/id/admin/konten/bonding, and every
 * menu item 404'd. The overview route is "", which is why the filter is still
 * needed for the rest.
 */
export function adminHref(locale: Locale, route: AdminRoute, ...rest: string[]) {
  const parts = [locale, "admin", ADMIN[route], ...rest].filter(Boolean);
  return `/${parts.join("/")}`;
}
