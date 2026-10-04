"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Notice, Textarea } from "@/components/ui";
import { Problems } from "@/components/admin/parts";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { saveStory } from "@/lib/admin-actions";
import { MUSIC_MODES } from "@/lib/admin/options";
import type { StoryPage, StoryRow, StoryTranslationRow } from "@/types/db";

/**
 * The story editor.
 *
 * Same shape as the activity editor, for the same reason: a page is one row
 * holding both languages, so the two locales cannot drift out of step and the
 * page-count rule is satisfied by construction rather than by validation.
 *
 * Choices are not editable here. An interactive story's branches are a
 * structure, not a text field, and a plain textarea would let an editor create
 * a page with one option — which the validator then refuses. Until there is a
 * proper branch editor, interactive stories are seeded from JSON and this form
 * says so rather than offering a control that produces broken content.
 */

const SELECT_CLASS =
  "w-full rounded-[14px] border border-line bg-white px-4 py-3 text-body text-ink focus:border-sage focus:outline-none";

type PageRow = { id: StoryPage; en: StoryPage };

export function StoryEditor({
  locale,
  story,
  translations,
  initialPages,
  problems,
}: {
  locale: Locale;
  story: StoryRow | null;
  translations: { id: StoryTranslationRow | null; en: StoryTranslationRow | null };
  initialPages: { id: StoryPage[]; en: StoryPage[] };
  problems: string[];
}) {
  const t = adminCopy(locale);
  const isNew = story === null;

  const [pageRows, setPageRows] = useState<PageRow[]>(() => {
    const count = Math.max(initialPages.id.length, initialPages.en.length, 3);
    return Array.from({ length: count }, (_, i) => ({
      id: initialPages.id[i] ?? { text: "" },
      en: initialPages.en[i] ?? { text: "" },
    }));
  });

  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  // A page that carries choices would lose them on save, so those rows are
  // shown read-only rather than silently flattened.
  const hasChoices = pageRows.some(
    (r) => (r.id.choices?.length ?? 0) > 0 || (r.en.choices?.length ?? 0) > 0,
  );

  function submit(data: FormData) {
    data.set("page_count", String(pageRows.length));
    start(async () => {
      const r = await saveStory(data);
      setResult(
        r.ok
          ? { ok: true, message: t.common.saved }
          : { ok: false, message: [r.message, ...(r.problems ?? [])].join(" · ") },
      );
    });
  }

  return (
    <form action={submit} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="is_new" value={isNew ? "1" : "0"} />
      <input type="hidden" name="id" value={story?.id ?? ""} />

      <Problems problems={problems} title={t.common.problems} />
      {result ? (
        <Notice tone={result.ok ? "neutral" : "care"}>{result.message}</Notice>
      ) : null}

      {hasChoices ? (
        <Notice tone="care" title={t.content.interactive}>
          {locale === "en"
            ? "This story has branching pages. Saving here keeps the text but not the choices, so edit the branches in content/stories and re-import instead."
            : "Cerita ini punya halaman bercabang. Menyimpan di sini mempertahankan teksnya tetapi bukan pilihannya, jadi ubah cabangnya di content/stories lalu impor ulang."}
        </Notice>
      ) : null}

      <Card className="space-y-5">
        <h2 className="text-section">{t.content.storiesTitle}</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t.content.theme} htmlFor="theme">
            <Input id="theme" name="theme" defaultValue={story?.theme ?? ""} />
          </Field>
          <Field label={t.content.ageMin} htmlFor="age_min_months">
            <Input
              id="age_min_months"
              name="age_min_months"
              type="number"
              min={0}
              max={72}
              defaultValue={story?.age_min_months ?? 12}
            />
          </Field>
          <Field label={t.content.ageMax} htmlFor="age_max_months">
            <Input
              id="age_max_months"
              name="age_max_months"
              type="number"
              min={1}
              max={72}
              defaultValue={story?.age_max_months ?? 60}
            />
          </Field>
          <Field label={t.content.readingMinutes} htmlFor="reading_minutes">
            <Input
              id="reading_minutes"
              name="reading_minutes"
              type="number"
              min={1}
              max={30}
              defaultValue={story?.reading_minutes ?? 4}
            />
          </Field>
          <Field label={t.content.musicMode} htmlFor="music_mode">
            <select
              id="music_mode"
              name="music_mode"
              defaultValue={story?.music_mode ?? "bedtime"}
              className={SELECT_CLASS}
            >
              <option value="">{t.common.none}</option>
              {MUSIC_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.content.illustration} htmlFor="cover_path">
            <Input
              id="cover_path"
              name="cover_path"
              defaultValue={story?.cover_path ?? ""}
              placeholder="/assets/scenes/…"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-5 border-t border-line pt-4">
          <label className="text-small flex items-center gap-2">
            <input
              type="checkbox"
              name="is_interactive"
              defaultChecked={story?.is_interactive ?? false}
              className="size-4 accent-[var(--color-sage)]"
            />
            {t.content.interactive}
          </label>
          <label className="text-small flex items-center gap-2">
            <input
              type="checkbox"
              name="is_premium"
              defaultChecked={story?.is_premium ?? false}
              className="size-4 accent-[var(--color-sage)]"
            />
            {t.content.premium}
          </label>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-section">
            {t.common.locale.id} &middot; {t.common.locale.en}
          </h2>
          <p className="text-small mt-1 text-ink-muted">{t.content.bothLocales}</p>
        </div>

        {(
          [
            ["title", t.content.titleField, false],
            ["blurb", t.content.blurb, true],
          ] as const
        ).map(([key, label, long]) => (
          <div key={key} className="grid gap-3 lg:grid-cols-2">
            <Field label={`${label} · ID`} htmlFor={`${key}_id`}>
              {long ? (
                <Textarea
                  id={`${key}_id`}
                  name={`${key}_id`}
                  rows={2}
                  defaultValue={(translations.id?.[key] as string) ?? ""}
                />
              ) : (
                <Input
                  id={`${key}_id`}
                  name={`${key}_id`}
                  defaultValue={(translations.id?.[key] as string) ?? ""}
                />
              )}
            </Field>
            <Field label={`${label} · EN`} htmlFor={`${key}_en`}>
              {long ? (
                <Textarea
                  id={`${key}_en`}
                  name={`${key}_en`}
                  rows={2}
                  defaultValue={(translations.en?.[key] as string) ?? ""}
                />
              ) : (
                <Input
                  id={`${key}_en`}
                  name={`${key}_en`}
                  defaultValue={(translations.en?.[key] as string) ?? ""}
                />
              )}
            </Field>
          </div>
        ))}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-section">{t.content.pagesHead}</h2>
          <span className="text-meta text-ink-faint">{pageRows.length}</span>
        </div>

        {pageRows.map((row, i) => (
          <div key={i} className="rounded-[16px] border border-line bg-white/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-meta text-ink-faint">
                {t.content.pagesHead} {i + 1}
              </span>
              {pageRows.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setPageRows((prev) => prev.filter((_, j) => j !== i))}
                  className="text-meta text-terracotta hover:underline"
                >
                  {t.content.removeStep}
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <Input
                  name={`page_speaker_id_${i}`}
                  defaultValue={row.id.speaker ?? ""}
                  placeholder="Tumi…"
                  aria-label={`Speaker ID ${i + 1}`}
                />
                <Textarea
                  name={`page_text_id_${i}`}
                  defaultValue={row.id.text}
                  rows={3}
                  placeholder={`${t.content.pageText} · ID`}
                  aria-label={`${t.content.pageText} ID ${i + 1}`}
                />
              </div>
              <div className="space-y-2">
                <Input
                  name={`page_speaker_en_${i}`}
                  defaultValue={row.en.speaker ?? ""}
                  placeholder="Tumi…"
                  aria-label={`Speaker EN ${i + 1}`}
                />
                <Textarea
                  name={`page_text_en_${i}`}
                  defaultValue={row.en.text}
                  rows={3}
                  placeholder={`${t.content.pageText} · EN`}
                  aria-label={`${t.content.pageText} EN ${i + 1}`}
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          tone="secondary"
          onClick={() =>
            setPageRows((prev) => [...prev, { id: { text: "" }, en: { text: "" } }])
          }
        >
          {t.content.addPage}
        </Button>
      </Card>

      <div className="sticky bottom-0 -mx-5 border-t border-line bg-cream/95 px-5 py-4 backdrop-blur">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </form>
  );
}
