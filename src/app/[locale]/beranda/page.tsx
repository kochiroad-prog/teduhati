import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader, AppShell } from "@/components/AppShell";
import { BondingCard } from "@/components/BondingCard";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Tumi } from "@/components/Tumi";
import { ButtonLink, Card, Chip, EmptyState, LeafCard, SectionHead } from "@/components/ui";
import { href, isLocale } from "@/i18n/config";
import { fill, getDictionary } from "@/i18n/dictionaries";
import { ageInMonths, formatAge, resolveAgeBand, timeOfDay } from "@/lib/age";
import { getSettings } from "@/lib/settings";
import {
  activeChild,
  getAgeBandLabel,
  getBondingDoneToday,
  getBondingOfDay,
  getRecommendations,
  getSession,
} from "@/lib/queries";
import { notFound } from "next/navigation";

export default async function HomePage({
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
  const [session, settings] = await Promise.all([getSession(), getSettings()]);
  if (!session) redirect(href(locale, "signIn"));

  const child = activeChild(session, anak);

  // No child yet: the home screen's only job is to get one added.
  if (!child) {
    return (
      <AppShell
        locale={locale}
        activeTab="home"
        header={<AppHeader locale={locale} right={<LocaleSwitch locale={locale} />} />}
      >
        <div className="pt-6">
          <div className="mb-6 flex justify-center">
            <Tumi state="happy" size={128} float />
          </div>
          <EmptyState
            title={dict.home.addChild}
            lead={dict.home.addChildLead}
            action={
              <ButtonLink href={href(locale, "child")} size="lg">
                {dict.home.addChild}
              </ButtonLink>
            }
          />
        </div>
      </AppShell>
    );
  }

  const months = ageInMonths(child.birth_date);
  const band = resolveAgeBand(months);
  const { greeting, musicMode } = timeOfDay();

  const [picks, bandLabel, bonding, bondingDone] = await Promise.all([
    getRecommendations({ childId: child.id, locale, limit: 4 }),
    getAgeBandLabel(band, locale),
    getBondingOfDay(child.id, locale),
    getBondingDoneToday(child.id),
  ]);

  const [lead, ...alsoToday] = picks;
  const parentName = session.profile?.display_name?.split(" ")[0];

  return (
    <AppShell
      locale={locale}
      activeTab="home"
      header={<AppHeader locale={locale} right={<LocaleSwitch locale={locale} />} />}
    >
      {/* Greeting: who is being greeted, and which child this screen is about. */}
      <div className="pb-5 pt-3">
        <p className="text-small text-ink-muted">
          {dict.greeting[greeting]}
          {parentName ? `, ${parentName}` : ""}
        </p>
        <h1 className="text-display mt-1">{child.name}</h1>
        <p className="text-small mt-1 text-ink-faint">
          {formatAge(months, dict)}
          {bandLabel ? ` · ${bandLabel.stage_name}` : ""}
        </p>
      </div>

      {/* The hero: one activity, one button. Everything else is quieter. */}
      {lead ? (
        <LeafCard>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-meta text-sage-dark">{dict.home.todayLabel}</p>
              <h2 className="text-title mt-1.5 text-balance">{lead.title}</h2>
            </div>
            <Tumi state="excited" size={64} float className="-mt-1 shrink-0" />
          </div>

          <p className="text-small mt-3 max-w-[40ch] text-ink-muted">{lead.summary}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Chip colorToken="sage">
              {lead.duration_minutes} {dict.activity.minutes}
            </Chip>
            {lead.domain_name ? <Chip colorToken="clay">{lead.domain_name}</Chip> : null}
          </div>

          <ButtonLink
            href={href(locale, "activities", lead.activity_id)}
            size="lg"
            className="mt-5 w-full"
          >
            {dict.home.start}
          </ButtonLink>
        </LeafCard>
      ) : (
        <EmptyState title={dict.activity.empty} lead={dict.home.todayLead} />
      )}

      {/* Bonding: the module's own daily surface, not an activity variant. */}
      {bonding ? (
        <section className="mt-7">
          <SectionHead
            title={dict.home.bondingLabel}
            action={
              <Link
                href={href(locale, "bonding")}
                className="text-meta text-sage-dark hover:underline"
              >
                {dict.bonding.title}
              </Link>
            }
          />
          <BondingCard
            locale={locale}
            childId={child.id}
            moment={bonding}
            done={bondingDone.has(bonding.bonding_moment_id)}
          />
        </section>
      ) : null}

      {/* Other picks: a plain list, not four identical hero cards. */}
      {alsoToday.length > 0 ? (
        <section className="mt-7">
          <SectionHead
            title={dict.home.alsoToday}
            action={
              <Link
                href={href(locale, "activities")}
                className="text-meta text-sage-dark hover:underline"
              >
                {dict.nav.activities}
              </Link>
            }
          />
          <ul className="space-y-2.5">
            {alsoToday.map((pick) => (
              <li key={pick.activity_id}>
                <Link
                  href={href(locale, "activities", pick.activity_id)}
                  className="surface flex items-center gap-3 p-4 transition-colors hover:border-sage"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-section truncate">{pick.title}</p>
                    <p className="text-small mt-0.5 text-ink-faint">
                      {pick.duration_minutes} {dict.activity.minutes}
                      {pick.domain_name ? ` · ${pick.domain_name}` : ""}
                    </p>
                  </div>
                  {pick.is_premium ? (
                    <span className="text-meta shrink-0 text-yellow">
                      {dict.common.premiumBadge}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Two quiet entries into the other modules. */}
      <section className="mt-7 grid grid-cols-2 gap-3">
        {settings.features.music ? (
          <Link href={href(locale, "music")} className="block">
            <Card className="h-full transition-colors hover:border-sage">
              <p className="text-meta text-ink-faint">{dict.home.musicLabel}</p>
              <p className="text-section mt-1">{dict.music.modes[musicMode]}</p>
            </Card>
          </Link>
        ) : null}
        <Link href={href(locale, "stories")} className="block">
          <Card className="h-full transition-colors hover:border-sage">
            <p className="text-meta text-ink-faint">{dict.home.storyLabel}</p>
            <p className="text-section mt-1">{dict.stories.title}</p>
          </Card>
        </Link>
      </section>

      <div className="mt-7 flex items-center justify-between">
        <Link
          href={href(locale, "garden")}
          className="text-meta text-sage-dark hover:underline"
        >
          {dict.home.gardenPeek}
        </Link>
        {session.children.length > 1 ? (
          <div className="flex gap-2">
            {session.children.map((c) => (
              <Link
                key={c.id}
                href={`${href(locale, "home")}?anak=${c.id}`}
                className={
                  c.id === child.id
                    ? "text-meta rounded-pill bg-sage px-3 py-1 text-white"
                    : "text-meta rounded-pill border border-line px-3 py-1 text-ink-muted"
                }
              >
                {c.name}
              </Link>
            ))}
          </div>
        ) : (
          <Link
            href={href(locale, "child")}
            className="text-meta text-ink-faint hover:text-ink-muted"
          >
            {fill(dict.child.title, {})}
          </Link>
        )}
      </div>
    </AppShell>
  );
}
