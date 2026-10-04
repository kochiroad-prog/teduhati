import Link from "next/link";
import { href, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

/**
 * The phone-shaped frame. On a wide screen the app stays a single column on a
 * deeper cream, so the edge of the product is legible without drawing a fake
 * device around it.
 */
export function AppShell({
  locale,
  children,
  activeTab,
  header,
  wide = false,
}: {
  locale: Locale;
  children: React.ReactNode;
  activeTab?: "home" | "activities" | "stories" | "garden";
  header?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-dvh justify-center">
      <div
        className={cn(
          "relative flex min-h-dvh w-full flex-col bg-cream sm:border-x sm:border-line",
          wide ? "max-w-[760px]" : "max-w-[520px]",
        )}
      >
        {header}
        <main className="flex-1 px-4 pb-28 pt-2">{children}</main>
        {activeTab ? <BottomNav locale={locale} active={activeTab} /> : null}
      </div>
    </div>
  );
}

/** Header used on the home screen: brand mark plus the language switch. */
export function AppHeader({
  locale,
  right,
}: {
  locale: Locale;
  right?: React.ReactNode;
}) {
  const dict = getDictionary(locale);
  return (
    <header className="flex items-center justify-between px-4 pb-1 pt-5">
      <Link href={href(locale, "home")} className="flex items-baseline gap-2">
        <span className="text-[1.0625rem] font-extrabold tracking-[-0.03em] text-sage-dark">
          {dict.brand.name}
        </span>
        <span aria-hidden="true" className="text-sage">
          &#9670;
        </span>
      </Link>
      {right}
    </header>
  );
}

/** Header used on inner pages: a back link and a title. */
export function PageHeader({
  locale,
  title,
  backTo = "home",
  right,
}: {
  locale: Locale;
  title: string;
  backTo?: Parameters<typeof href>[1];
  right?: React.ReactNode;
}) {
  const dict = getDictionary(locale);
  return (
    <header className="flex items-center gap-3 px-4 pb-2 pt-5">
      <Link
        href={href(locale, backTo)}
        aria-label={dict.activity.back}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-line bg-white text-ink-muted transition-colors hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M11 4 L6 9 L11 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <h1 className="text-title flex-1 truncate">{title}</h1>
      {right}
    </header>
  );
}
