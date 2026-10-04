"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { adminHref, type AdminRoute } from "@/lib/admin/routes";
import { cn } from "@/lib/utils";

/**
 * The console's one navigation surface.
 *
 * A sidebar on a wide screen, a collapsible list on a narrow one. The active
 * item is decided by the path rather than passed down from each page, so adding
 * a section means adding one entry here and nothing else.
 */

type Item = { route: AdminRoute; label: string; badge?: number };

export function AdminNav({
  locale,
  pendingOrders = 0,
  drafts = 0,
}: {
  locale: Locale;
  pendingOrders?: number;
  drafts?: number;
}) {
  const t = adminCopy(locale);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups: { heading: string | null; items: Item[] }[] = [
    { heading: null, items: [{ route: "overview", label: t.nav.overview }] },
    {
      heading: t.nav.content,
      items: [
        { route: "activities", label: t.nav.activities, badge: drafts },
        { route: "stories", label: t.nav.stories },
        { route: "bonding", label: t.nav.bonding },
        { route: "worksheets", label: t.nav.worksheets },
        { route: "audio", label: t.nav.audio },
      ],
    },
    {
      heading: t.nav.users,
      items: [
        { route: "users", label: t.nav.users },
        { route: "orders", label: t.nav.orders, badge: pendingOrders },
        { route: "subscriptions", label: t.nav.subscriptions },
      ],
    },
    {
      heading: t.nav.settings,
      items: [
        { route: "settings", label: t.nav.settings },
        { route: "audit", label: t.nav.audit },
      ],
    },
  ];

  // The overview lives at /admin exactly; every other section matches its own
  // prefix, so a nested editor page keeps its parent highlighted.
  function isActive(route: AdminRoute): boolean {
    const target = adminHref(locale, route);
    if (route === "overview") return pathname === target || pathname === `${target}/`;
    return pathname === target || pathname.startsWith(`${target}/`);
  }

  const list = (
    <nav className="space-y-5">
      {groups.map((group, gi) => (
        <div key={group.heading ?? `g${gi}`}>
          {group.heading ? (
            <p className="text-meta mb-1.5 px-3 text-ink-faint">{group.heading}</p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.route);
              return (
                <li key={item.route}>
                  <Link
                    href={adminHref(locale, item.route)}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-[12px] px-3 py-2 text-[0.9375rem] transition-colors",
                      active
                        ? "bg-sage-soft font-semibold text-sage-dark"
                        : "text-ink-muted hover:bg-black/[0.035] hover:text-ink",
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="text-meta shrink-0 rounded-pill bg-terracotta-soft px-2 py-0.5 text-[#8f4f38]">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Narrow screens: one button that opens the same list. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-meta flex h-10 items-center gap-2 rounded-pill border border-line bg-white px-4 text-ink-muted"
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
          Menu
        </button>
        {open ? (
          <div className="mt-3 rounded-[16px] border border-line bg-white p-3">{list}</div>
        ) : null}
      </div>

      <div className="hidden lg:block">{list}</div>
    </>
  );
}
