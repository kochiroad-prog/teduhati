import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Chip, EmptyState } from "@/components/ui";
import { href, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ageInMonths } from "@/lib/age";
import { activeChild, getSession, getStoriesForAge } from "@/lib/queries";

export default async function StoriesPage({
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

  const stories = await getStoriesForAge(ageInMonths(child.birth_date), locale);

  return (
    <AppShell
      locale={locale}
      activeTab="stories"
      header={<PageHeader locale={locale} title={dict.stories.title} />}
    >
      <p className="text-small pb-5 text-ink-muted">{dict.stories.lead}</p>

      {stories.length === 0 ? (
        <EmptyState title={dict.stories.title} lead={dict.stories.empty} />
      ) : (
        <ul className="space-y-2.5">
          {stories.map((story) => (
            <li key={story.id} className="surface p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-section text-balance">{story.title}</p>
                {story.is_premium ? (
                  <span className="text-meta shrink-0 text-yellow">
                    {dict.common.premiumBadge}
                  </span>
                ) : null}
              </div>
              <p className="text-small mt-1 text-ink-muted">{story.blurb}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip colorToken="dusty_blue">
                  {story.reading_minutes} {dict.stories.minutes}
                </Chip>
                {story.is_interactive ? (
                  <Chip colorToken="plum">{dict.stories.interactive}</Chip>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
