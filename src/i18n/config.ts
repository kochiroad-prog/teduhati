export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";

export const LOCALE_LABELS: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Route segments stay in Indonesian for both locales. TEDUHATI is an Indonesian
 * product and the URLs are part of the brand; translating them would double the
 * routing surface for no reader benefit.
 */
export const ROUTES = {
  home: "",
  signIn: "masuk",
  signUp: "daftar",
  forgotPassword: "lupa-sandi",
  newPassword: "sandi-baru",
  child: "anak",
  activities: "aktivitas",
  stories: "cerita",
  bonding: "bonding",
  music: "musik",
  garden: "tumbuh",
  ask: "tanya",
  plans: "paket",
} as const;

export function href(locale: Locale, route: keyof typeof ROUTES, ...rest: string[]) {
  const parts = [locale, ROUTES[route], ...rest].filter(Boolean);
  return `/${parts.join("/")}`;
}
