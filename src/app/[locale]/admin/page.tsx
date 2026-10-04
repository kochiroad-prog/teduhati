import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AdminOrders } from "@/components/AdminOrders";
import { AdminTrend } from "@/components/AdminTrend";
import { SignOutButton } from "@/components/SignOutButton";
import { Card, EmptyState, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { href, isLocale } from "@/i18n/config";
import { formatRupiah } from "@/lib/entitlements";
import { getSession } from "@/lib/queries";
import type { AdminDailyRow, AdminOverview, OrderRow, ProfileRow } from "@/types/db";

/**
 * Staff dashboard.
 *
 * Read access comes from the `is_staff()` policies, and the figures come from
 * `admin_overview()` in Postgres rather than a dozen client queries. The only
 * thing on this screen that writes is order approval, which goes through
 * `approve_order` and is restricted to the admin role.
 */

export const dynamic = "force-dynamic";

const COPY = {
  id: {
    title: "Dashboard",
    denied: "Halaman ini hanya untuk tim TEDUHATI.",
    deniedBack: "Kembali ke beranda",
    parents: "Orang tua",
    children: "Anak terdaftar",
    activeSubs: "Langganan aktif",
    mrr: "Pendapatan bulanan",
    signups: "Pendaftar 30 hari",
    completions: "Aktivitas selesai 7 hari",
    aiQuestions: "Pertanyaan AI bulan ini",
    pending: "Menunggu verifikasi",
    contentTitle: "Konten",
    activities: "Aktivitas",
    stories: "Cerita",
    bonding: "Momen bonding",
    published: "tayang",
    trendTitle: "30 hari terakhir",
    trendSignups: "Pendaftar",
    trendCompletions: "Aktivitas selesai",
    ordersTitle: "Pesanan",
    ordersEmpty: "Belum ada pesanan yang perlu diperiksa.",
    ordersEmptyLead: "Pesanan yang sudah ditransfer orang tua akan muncul di sini.",
    recentTitle: "Pendaftar terbaru",
    noAdminWrite:
      "Anda masuk sebagai editor, jadi bisa melihat semuanya tetapi tidak bisa menyetujui pesanan.",
  },
  en: {
    title: "Dashboard",
    denied: "This page is for the TEDUHATI team only.",
    deniedBack: "Back home",
    parents: "Parents",
    children: "Children",
    activeSubs: "Active subscriptions",
    mrr: "Monthly revenue",
    signups: "Sign-ups, 30 days",
    completions: "Activities done, 7 days",
    aiQuestions: "AI questions this month",
    pending: "Awaiting review",
    contentTitle: "Content",
    activities: "Activities",
    stories: "Stories",
    bonding: "Bonding moments",
    published: "published",
    trendTitle: "Last 30 days",
    trendSignups: "Sign-ups",
    trendCompletions: "Activities done",
    ordersTitle: "Orders",
    ordersEmpty: "Nothing to review right now.",
    ordersEmptyLead: "Orders a parent has paid for will appear here.",
    recentTitle: "Newest parents",
    noAdminWrite:
      "You're signed in as an editor, so you can see everything but cannot approve orders.",
  },
} as const;

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-meta text-ink-faint">{label}</p>
      <p className="font-display mt-1 text-[1.75rem] leading-none text-ink">{value}</p>
      {hint ? <p className="text-small mt-1 text-ink-faint">{hint}</p> : null}
    </Card>
  );
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = COPY[locale];

  const session = await getSession();
  if (!session) redirect(href(locale, "signIn"));

  const supabase = await createClient();
  const [{ data: isStaff }, { data: isAdmin }] = await Promise.all([
    supabase.rpc("is_staff", {}),
    supabase.rpc("is_admin", {}),
  ]);

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-16">
        <EmptyState
          title={t.denied}
          lead=""
          action={
            <Link href={href(locale, "home")} className="text-meta text-sage-dark hover:underline">
              {t.deniedBack}
            </Link>
          }
        />
      </div>
    );
  }

  const [{ data: overviewRaw }, { data: dailyRaw }, { data: ordersRaw }, { data: recentRaw }] =
    await Promise.all([
      supabase.rpc("admin_overview", {}),
      supabase.rpc("admin_daily", { p_days: 30 }),
      supabase
        .from("orders")
        .select("*")
        .in("status", ["awaiting_confirmation", "awaiting_payment"])
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("profiles")
        .select("id, display_name, role, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const o = (overviewRaw ?? null) as AdminOverview | null;
  const daily = (dailyRaw ?? []) as AdminDailyRow[];
  const orders = (ordersRaw ?? []) as OrderRow[];
  const recent = (recentRaw ?? []) as Pick<
    ProfileRow,
    "id" | "display_name" | "role" | "created_at"
  >[];

  const n = (v: number | undefined) => (v ?? 0).toLocaleString("id-ID");

  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-line bg-[#fffdf8]">
        <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between px-5">
          <div className="flex items-baseline gap-3">
            <Link href={href(locale, "home")} className="font-display text-[1.0625rem] text-sage-dark">
              Teduhati
            </Link>
            <span className="text-meta text-ink-faint">{t.title}</span>
          </div>
          <div className="w-28">
            <SignOutButton locale={locale} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] space-y-8 px-5 py-8">
        {!isAdmin ? <Notice>{t.noAdminWrite}</Notice> : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t.parents} value={n(o?.parents)} hint={`+${n(o?.signups_30d)} / 30d`} />
          <Stat label={t.children} value={n(o?.children)} />
          <Stat label={t.activeSubs} value={n(o?.active_subs)} />
          <Stat label={t.mrr} value={formatRupiah(o?.mrr ?? 0)} />
          <Stat label={t.completions} value={n(o?.completions_7d)} />
          <Stat label={t.aiQuestions} value={n(o?.ai_questions_month)} />
          <Stat label={t.pending} value={n(o?.orders_pending)} />
          <Stat
            label={t.contentTitle}
            value={`${n(o?.activities_published)}`}
            hint={`${t.activities} ${t.published} · ${n(o?.stories_published)} ${t.stories} · ${n(o?.bonding_published)} ${t.bonding}`}
          />
        </section>

        <section>
          <h2 className="text-section mb-3">{t.trendTitle}</h2>
          <AdminTrend
            data={daily}
            labels={{ signups: t.trendSignups, completions: t.trendCompletions }}
          />
        </section>

        <section>
          <h2 className="text-section mb-3">{t.ordersTitle}</h2>
          {orders.length === 0 ? (
            <EmptyState title={t.ordersEmpty} lead={t.ordersEmptyLead} />
          ) : (
            <AdminOrders locale={locale} orders={orders} canReview={Boolean(isAdmin)} />
          )}
        </section>

        <section>
          <h2 className="text-section mb-3">{t.recentTitle}</h2>
          <Card className="divide-y divide-line p-0">
            {recent.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-small truncate">{p.display_name ?? "—"}</p>
                  <p className="text-meta text-ink-faint">
                    {new Date(p.created_at).toLocaleDateString(locale === "en" ? "en-GB" : "id-ID")}
                  </p>
                </div>
                {p.role !== "parent" ? (
                  <span className="text-meta rounded-pill bg-sage-soft px-2.5 py-1 text-sage-dark">
                    {p.role}
                  </span>
                ) : null}
              </div>
            ))}
          </Card>
        </section>
      </main>
    </div>
  );
}
