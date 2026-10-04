import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/SignOutButton";
import { EmptyState, Notice } from "@/components/ui";
import { href, isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { getAdminContext } from "@/lib/admin/guard";
import { createClient } from "@/lib/supabase/server";

/**
 * The console frame.
 *
 * The staff check lives here rather than in each page, so a new section cannot
 * be added without it. An editor sees the whole console and is told once, at the
 * top, what they cannot do — rather than discovering it by pressing a button
 * that then refuses.
 */

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const ctx = await getAdminContext();
  if (!ctx.userId) redirect(href(locale, "signIn"));

  if (!ctx.isStaff) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-16">
        <EmptyState
          title={
            locale === "en"
              ? "This page is for the TEDUHATI team only."
              : "Halaman ini hanya untuk tim TEDUHATI."
          }
          lead=""
          action={
            <Link
              href={href(locale, "home")}
              className="text-meta text-sage-dark hover:underline"
            >
              {locale === "en" ? "Back home" : "Kembali ke beranda"}
            </Link>
          }
        />
      </div>
    );
  }

  // Two counts, for the badges in the sidebar: the things that are actually
  // waiting for someone. Cheap enough to run on every console page.
  const supabase = await createClient();
  const [{ count: pendingOrders }, { count: drafts }] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_confirmation"),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "review"]),
  ]);

  return (
    <div className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-20 border-b border-line bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between gap-4 px-5">
          <div className="flex min-w-0 items-baseline gap-3">
            <Link
              href={href(locale, "admin")}
              className="font-display shrink-0 text-[1.0625rem] text-sage-dark"
            >
              Teduhati
            </Link>
            <span className="text-meta hidden text-ink-faint sm:inline">
              {ctx.isAdmin ? t.users.roleAdmin : t.users.roleEditor}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={href(locale, "home")}
              className="text-meta hidden text-ink-muted hover:text-ink sm:inline"
            >
              {t.nav.backToApp}
            </Link>
            <span className="text-meta hidden max-w-[22ch] truncate text-ink-faint md:inline">
              {ctx.email}
            </span>
            <div className="w-28">
              <SignOutButton locale={locale} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1320px] gap-8 px-5 py-6 lg:flex">
        <aside className="mb-5 shrink-0 lg:mb-0 lg:w-56">
          <div className="lg:sticky lg:top-24">
            <AdminNav
              locale={locale}
              pendingOrders={pendingOrders ?? 0}
              drafts={drafts ?? 0}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {!ctx.isAdmin ? (
            <div className="mb-6">
              <Notice>{t.common.editorNotice}</Notice>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
