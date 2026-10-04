import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/admin/parts";
import { StatusControl } from "@/components/admin/StatusControl";
import { StoryEditor } from "@/components/admin/StoryEditor";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { getAdminContext } from "@/lib/admin/guard";
import { adminHref } from "@/lib/admin/routes";
import { createClient } from "@/lib/supabase/server";
import { parsePages, type StoryRow, type StoryTranslationRow } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function StoryEditorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);
  const isNew = id === "baru";

  const ctx = await getAdminContext();
  const supabase = await createClient();

  let story: StoryRow | null = null;
  let translations: { id: StoryTranslationRow | null; en: StoryTranslationRow | null } = {
    id: null,
    en: null,
  };
  let problems: string[] = [];

  if (!isNew) {
    const [{ data: row }, { data: trRows }, { data: problemRows }] = await Promise.all([
      supabase.from("stories").select("*").eq("id", id).maybeSingle(),
      supabase.from("story_translations").select("*").eq("story_id", id),
      supabase.rpc("validate_story", { p_id: id }),
    ]);
    if (!row) notFound();
    story = row as StoryRow;
    const list = (trRows ?? []) as StoryTranslationRow[];
    translations = {
      id: list.find((r) => r.locale === "id") ?? null,
      en: list.find((r) => r.locale === "en") ?? null,
    };
    problems = (problemRows ?? []) as string[];
  }

  const initialPages = {
    id: translations.id ? parsePages(translations.id.pages) : [],
    en: translations.en ? parsePages(translations.en.pages) : [],
  };

  const title = isNew
    ? t.content.newStory
    : translations[locale]?.title ?? translations.id?.title ?? id;

  return (
    <div>
      <PageHead
        title={title}
        action={
          <Link
            href={adminHref(locale, "stories")}
            className="text-meta text-ink-muted hover:text-ink"
          >
            &larr; {t.content.storiesTitle}
          </Link>
        }
      />

      <div className="space-y-6">
        {story ? (
          <StatusControl
            locale={locale}
            table="stories"
            id={story.id}
            status={story.status}
            canPublish={ctx.isAdmin}
          />
        ) : null}

        <StoryEditor
          locale={locale}
          story={story}
          translations={translations}
          initialPages={initialPages}
          problems={problems}
        />
      </div>
    </div>
  );
}
