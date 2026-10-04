import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BondingCard } from "@/components/BondingCard";
import { EmptyState } from "@/components/ui";
import { href, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  activeChild,
  getBondingDoneToday,
  getBondingOfDay,
  getSession,
} from "@/lib/queries";

/**
 * Bonding is its own module, so it gets its own screen rather than living as a
 * section of the home page. One moment per day, chosen for the child's age.
 */
export default async function BondingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ anak?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const { anak } = await searchParams;

  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(href(locale, "signIn"));

  const child = activeChild(session, anak);
  if (!child) redirect(href(locale, "child"));

  const [moment, done] = await Promise.all([
    getBondingOfDay(child.id, locale),
    getBondingDoneToday(child.id),
  ]);

  return (
    <AppShell
      locale={locale}
      header={<PageHeader locale={locale} title={dict.bonding.title} />}
    >
      <p className="text-small pb-5 text-ink-muted">{dict.bonding.lead}</p>

      {moment ? (
        <BondingCard
          locale={locale}
          childId={child.id}
          moment={moment}
          done={done.has(moment.bonding_moment_id)}
        />
      ) : (
        <EmptyState title={dict.bonding.title} lead={dict.bonding.empty} />
      )}
    </AppShell>
  );
}
