"use client";

import { usePathname, useRouter } from "next/navigation";
import { LOCALES, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

/**
 * Swaps the locale segment in place, so switching language keeps the reader on
 * the same screen instead of sending them home.
 */
export function LocaleSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const dict = getDictionary(locale);

  function switchTo(next: Locale) {
    // The proxy writes the teduhati_locale cookie on every response, so the
    // choice persists from the navigation alone — no cookie write needed here.
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${next}${rest ? `/${rest}` : ""}`);
  }

  return (
    <div
      role="group"
      aria-label={dict.common.language}
      className="flex items-center rounded-pill border border-line bg-white p-0.5"
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          aria-pressed={code === locale}
          className={
            code === locale
              ? "rounded-pill bg-sage px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-white"
              : "rounded-pill px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-faint hover:text-ink-muted"
          }
        >
          {code}
        </button>
      ))}
    </div>
  );
}
