import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { GardenPlant } from "@/components/GardenPlant";
import { Tumi } from "@/components/Tumi";
import { EmptyState, Notice } from "@/components/ui";
import { href, isLocale } from "@/i18n/config";
import { fill, getDictionary } from "@/i18n/dictionaries";
import { STAGE_THRESHOLDS, stageIndex, type GardenStage } from "@/lib/tokens";
import { activeChild, getGarden, getSession } from "@/lib/queries";
import { GARDEN_STAGES } from "@/lib/tokens";

export default async function GardenPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ anak?: string; selesai?: string }>;
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

  const beds = await getGarden(child.id, locale);
  const totalDone = beds.reduce((sum, b) => sum + (b.done_count ?? 0), 0);
  const justFinished = Boolean(sp.selesai);

  return (
    <AppShell
      locale={locale}
      activeTab="garden"
      header={<PageHeader locale={locale} title={dict.garden.title} />}
    >
      {justFinished ? (
        <div className="mb-5 flex items-center gap-4 rounded-[18px] border border-[#c9d8cd] bg-sage-soft px-5 py-4">
          <Tumi state="celebrate" size={48} className="shrink-0" />
          <p className="text-small">
            {fill(dict.activity.doneLead, { child: child.name })}
          </p>
        </div>
      ) : (
        <p className="text-small pb-5 text-ink-muted">{dict.garden.lead}</p>
      )}

      {totalDone === 0 && !justFinished ? (
        <EmptyState title={dict.garden.emptyTitle} lead={dict.garden.emptyLead} />
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {beds.map((bed, index) => {
            const stage = (bed.stage ?? "seed") as GardenStage;
            const done = bed.done_count ?? 0;
            const threshold = STAGE_THRESHOLDS[stage];
            const nextStage = GARDEN_STAGES[stageIndex(stage) + 1];

            return (
              <li
                key={bed.domain_code ?? `bed-${index}`}
                className="leaf-sm border border-line bg-white p-4"
              >
                <div className="flex justify-center">
                  <GardenPlant stage={stage} colorToken={bed.color_token} size={76} />
                </div>
                <p className="text-section mt-2 text-center">{bed.name}</p>
                <p className="text-small mt-0.5 text-center text-ink-faint">
                  {dict.garden.stage[stage]}
                </p>
                <p className="text-small mt-2 text-center text-ink-muted">
                  {threshold === null || !nextStage
                    ? dict.garden.fullGrown
                    : fill(dict.garden.nextStage, {
                        remaining: Math.max(1, threshold - done),
                        stage: dict.garden.stage[nextStage],
                      })}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-7">
        <Notice>{dict.garden.disclaimer}</Notice>
      </div>
    </AppShell>
  );
}
