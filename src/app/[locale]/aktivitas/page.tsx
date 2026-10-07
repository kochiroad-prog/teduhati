import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ActivityFilters } from "@/components/ActivityFilters";
import { ActivityImage } from "@/components/ActivityImage";
import { Chip, EmptyState } from "@/components/ui";
import { href, isLocale } from "@/i18n/config";
import { resolveForActivities } from "@/lib/illustrations";
import { getDictionary } from "@/i18n/dictionaries";
import {
  activeChild,
  getDomainOptions,
  getMaterialOptions,
  getRecommendations,
  getSession,
} from "@/lib/queries";

export default async function ActivitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    anak?: string;
    menit?: string;
    area?: string;
    bahan?: string;
  }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const sp = await searchParams;

  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(href(locale, "signIn"));

  const child = activeChild(session, sp.anak);
  if (!child) redirect(href(locale, "child"));

  const maxMinutes = sp.menit ? Number(sp.menit) : null;
  const domain = sp.area ?? null;
  const materials = sp.bahan ? sp.bahan.split(",").filter(Boolean) : null;

  const [picks, domains, materialOptions] = await Promise.all([
    getRecommendations({
      childId: child.id,
      locale,
      limit: 20,
      maxMinutes: Number.isFinite(maxMinutes) ? maxMinutes : null,
      domain,
      materials,
    }),
    getDomainOptions(locale),
    getMaterialOptions(locale),
  ]);

  // One lookup for the whole list. The alt text is empty on purpose: the title
  // sits right beside it, so announcing the picture as well would read the same
  // thing twice to a screen reader.
  const pictures = await resolveForActivities(picks.map((p) => p.activity_id));

  return (
    <AppShell
      locale={locale}
      activeTab="activities"
      header={<PageHeader locale={locale} title={dict.nav.activities} />}
    >
      <ActivityFilters
        locale={locale}
        domains={domains}
        materials={materialOptions}
        selected={{
          minutes: sp.menit ?? null,
          domain,
          materials: materials ?? [],
        }}
      />

      {picks.length === 0 ? (
        <div className="mt-5">
          <EmptyState title={dict.activity.filterTitle} lead={dict.activity.empty} />
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {picks.map((pick) => (
            <li key={pick.activity_id}>
              <Link
                href={href(locale, "activities", pick.activity_id)}
                className="surface block p-4 transition-colors hover:border-sage"
              >
                <div className="flex gap-3.5">
                  <ActivityImage
                    src={pictures.get(pick.activity_id) ?? null}
                    alt=""
                    size={64}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-section text-balance">{pick.title}</p>
                      {pick.is_premium ? (
                        <span className="text-meta shrink-0 text-yellow">
                          {dict.common.premiumBadge}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-small mt-1 line-clamp-2 text-ink-muted">
                      {pick.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Chip colorToken="sage">
                        {pick.duration_minutes} {dict.activity.minutes}
                      </Chip>
                      {pick.domain_name ? (
                        <Chip colorToken="clay">{pick.domain_name}</Chip>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
