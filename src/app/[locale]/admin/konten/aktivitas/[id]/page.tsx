import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityEditor } from "@/components/admin/ActivityEditor";
import { PageHead } from "@/components/admin/parts";
import { StatusControl } from "@/components/admin/StatusControl";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { getAdminContext } from "@/lib/admin/guard";
import { adminHref } from "@/lib/admin/routes";
import { getTaxonomy } from "@/lib/admin/taxonomy";
import { createClient } from "@/lib/supabase/server";
import { parseSteps, type ActivityRow, type ActivityTranslationRow } from "@/types/db";

/**
 * One activity, in both languages.
 *
 * The id segment `baru` is the new-activity form: the row does not exist yet,
 * so there is nothing to publish and no status to change, and the real id is
 * allocated by `next_content_id` when the first save lands.
 */

export const dynamic = "force-dynamic";

export default async function ActivityEditorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);
  const isNew = id === "baru";

  const [ctx, taxonomy] = await Promise.all([getAdminContext(), getTaxonomy(locale)]);
  const supabase = await createClient();

  let activity: ActivityRow | null = null;
  let translations: { id: ActivityTranslationRow | null; en: ActivityTranslationRow | null } = {
    id: null,
    en: null,
  };
  let problems: string[] = [];

  if (!isNew) {
    const [{ data: row }, { data: trRows }, { data: problemRows }] = await Promise.all([
      supabase.from("activities").select("*").eq("id", id).maybeSingle(),
      supabase.from("activity_translations").select("*").eq("activity_id", id),
      supabase.rpc("validate_activity", { p_id: id }),
    ]);

    if (!row) notFound();
    activity = row as ActivityRow;

    const list = (trRows ?? []) as ActivityTranslationRow[];
    translations = {
      id: list.find((r) => r.locale === "id") ?? null,
      en: list.find((r) => r.locale === "en") ?? null,
    };
    problems = (problemRows ?? []) as string[];
  }

  const initialSteps = {
    id: translations.id ? parseSteps(translations.id.steps) : [],
    en: translations.en ? parseSteps(translations.en.steps) : [],
  };

  const title = isNew
    ? t.content.newActivity
    : translations[locale]?.title ?? translations.id?.title ?? id;

  return (
    <div>
      <PageHead
        title={title}
        lead={isNew ? t.content.bothLocales : undefined}
        action={
          <Link
            href={adminHref(locale, "activities")}
            className="text-meta text-ink-muted hover:text-ink"
          >
            &larr; {t.content.activitiesTitle}
          </Link>
        }
      />

      <div className="space-y-6">
        {activity ? (
          <StatusControl
            locale={locale}
            table="activities"
            id={activity.id}
            status={activity.status}
            canPublish={ctx.isAdmin}
          />
        ) : null}

        <ActivityEditor
          locale={locale}
          activity={activity}
          translations={translations}
          initialSteps={initialSteps}
          taxonomy={taxonomy}
          problems={problems}
        />
      </div>
    </div>
  );
}
