import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ActivityFlow } from "@/components/ActivityFlow";
import { href, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { activeChild, getActivity, getSession } from "@/lib/queries";
import { getIllustrationIndex, resolveIllustration } from "@/lib/illustrations";
import { parseSteps } from "@/types/db";

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ anak?: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const { anak } = await searchParams;

  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(href(locale, "signIn"));

  const child = activeChild(session, anak);
  if (!child) redirect(href(locale, "child"));

  const detail = await getActivity(id, locale);
  if (!detail) notFound();

  const steps = parseSteps(detail.text.steps);

  // The full ladder is reachable here because the activity row is in hand:
  // its own picture, then its domain at this age band, then its domain.
  const picture = resolveIllustration(await getIllustrationIndex(), {
    activityId: detail.activity.id,
    domain: detail.activity.primary_domain,
    ageBand: detail.activity.age_band_code,
  });

  return (
    <AppShell
      locale={locale}
      header={
        <PageHeader locale={locale} title={detail.text.title} backTo="activities" />
      }
    >
      <ActivityFlow
        locale={locale}
        childId={child.id}
        childName={child.name}
        activityId={detail.activity.id}
        pictureUrl={picture}
        durationMinutes={detail.activity.duration_minutes}
        domainName={detail.domainName}
        colorToken={detail.colorToken}
        noMaterials={detail.activity.no_materials}
        materialNames={detail.materialNames}
        materialsText={detail.text.materials_text}
        summary={detail.text.summary}
        learningGoal={detail.text.learning_goal}
        steps={steps}
        parentTip={detail.text.parent_tip}
        safetyNotes={detail.text.safety_notes}
        variations={detail.text.variations}
      />

      <p className="text-small mt-8 text-ink-faint">{dict.garden.disclaimer}</p>
    </AppShell>
  );
}
