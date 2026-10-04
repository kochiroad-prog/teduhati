import Link from "next/link";
import { href, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

type Tab = "home" | "activities" | "stories" | "garden";

const ICONS: Record<Tab, React.ReactNode> = {
  home: (
    <path
      d="M3 10 L11 3.5 L19 10 V18 a1 1 0 0 1 -1 1 h-4 v-5 h-4 v5 H4 a1 1 0 0 1 -1 -1 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  activities: (
    <>
      <circle
        cx="11"
        cy="11"
        r="7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M11 7.5 V11 L13.5 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </>
  ),
  stories: (
    <path
      d="M3.5 4.5 h6 a2 2 0 0 1 2 2 v12 a2 2 0 0 0 -2 -2 h-6 Z M18.5 4.5 h-6 a2 2 0 0 0 -2 2 v12 a2 2 0 0 1 2 -2 h6 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  garden: (
    <>
      <path
        d="M11 19 V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M11 11 C7.5 11 5.5 9 5 6 C9 5.5 10.5 7.5 11 11 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M11 9 C14.5 9 16.5 7 17 4 C13 3.5 11.5 5.5 11 9 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </>
  ),
};

export function BottomNav({ locale, active }: { locale: Locale; active: Tab }) {
  const dict = getDictionary(locale);

  const tabs: { key: Tab; label: string; to: Parameters<typeof href>[1] }[] = [
    { key: "home", label: dict.nav.home, to: "home" },
    { key: "activities", label: dict.nav.activities, to: "activities" },
    { key: "stories", label: dict.nav.stories, to: "stories" },
    { key: "garden", label: dict.nav.garden, to: "garden" },
  ];

  return (
    <nav
      aria-label={dict.brand.name}
      className="fixed bottom-0 z-20 w-full max-w-[520px] border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={href(locale, tab.to)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 transition-colors",
                  on ? "text-sage-dark" : "text-ink-faint hover:text-ink-muted",
                )}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                  {ICONS[tab.key]}
                </svg>
                <span className="text-[0.6875rem] font-semibold tracking-[0.004em]">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
