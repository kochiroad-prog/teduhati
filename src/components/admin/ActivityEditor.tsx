"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Notice, Textarea } from "@/components/ui";
import { Problems } from "@/components/admin/parts";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { saveActivity } from "@/lib/admin-actions";
import { MUSIC_MODES, type Option, type Taxonomy } from "@/lib/admin/options";
import type { ActivityRow, ActivityStep, ActivityTranslationRow } from "@/types/db";
import { cn } from "@/lib/utils";

/**
 * The activity editor.
 *
 * The one structural decision worth explaining: a step is a row, and a row
 * holds both languages. The validator requires the two locales to have the same
 * number of steps, so rather than letting an editor desynchronise them and then
 * refusing the save, the form makes it impossible — adding a step adds it to
 * both, and removing one removes both.
 *
 * Everything else is a plain form posting to a server action. The save and the
 * publish are separate: saving a draft never has to pass the safety gate, and
 * publishing always does.
 */

type LocaleFields = {
  title: string;
  summary: string;
  learning_goal: string;
  parent_tip: string;
  safety_notes: string;
  variations: string;
  materials_text: string;
};

type StepRow = { id: ActivityStep; en: ActivityStep };

const EMPTY_STEP: StepRow = {
  id: { title: "", body: "" },
  en: { title: "", body: "" },
};

const SELECT_CLASS =
  "w-full rounded-[14px] border border-line bg-white px-4 py-3 text-body text-ink focus:border-sage focus:outline-none";

function toFields(tr: ActivityTranslationRow | null): LocaleFields {
  return {
    title: tr?.title ?? "",
    summary: tr?.summary ?? "",
    learning_goal: tr?.learning_goal ?? "",
    parent_tip: tr?.parent_tip ?? "",
    safety_notes: tr?.safety_notes ?? "",
    variations: (tr?.variations ?? []).join("\n"),
    materials_text: tr?.materials_text ?? "",
  };
}

export function ActivityEditor({
  locale,
  activity,
  translations,
  initialSteps,
  taxonomy,
  problems,
}: {
  locale: Locale;
  activity: ActivityRow | null;
  translations: { id: ActivityTranslationRow | null; en: ActivityTranslationRow | null };
  initialSteps: { id: ActivityStep[]; en: ActivityStep[] };
  taxonomy: Taxonomy;
  problems: string[];
}) {
  const t = adminCopy(locale);
  const isNew = activity === null;

  const [stepRows, setStepRows] = useState<StepRow[]>(() => {
    const count = Math.max(initialSteps.id.length, initialSteps.en.length, 3);
    return Array.from({ length: count }, (_, i) => ({
      id: initialSteps.id[i] ?? { title: "", body: "" },
      en: initialSteps.en[i] ?? { title: "", body: "" },
    }));
  });

  const [materials, setMaterials] = useState<string[]>(activity?.materials ?? []);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const fieldsId = toFields(translations.id);
  const fieldsEn = toFields(translations.en);

  // The safety rule, mirrored in the browser so the editor sees the
  // requirement appear the moment it applies rather than on save.
  const [ageMin, setAgeMin] = useState(activity?.age_min_months ?? 0);
  const needsSafety = materials.length > 0 || ageMin < 12;

  function submit(data: FormData) {
    data.set("step_count", String(stepRows.length));
    start(async () => {
      const r = await saveActivity(data);
      setResult(
        r.ok
          ? { ok: true, message: t.common.saved }
          : { ok: false, message: [r.message, ...(r.problems ?? [])].join(" · ") },
      );
    });
  }

  function toggleMaterial(code: string) {
    setMaterials((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  const skillGroups = taxonomy.skills.reduce<Record<string, Option[]>>((acc, s) => {
    const key = s.group ?? "";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <form action={submit} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="is_new" value={isNew ? "1" : "0"} />
      <input type="hidden" name="id" value={activity?.id ?? ""} />
      {materials.map((m) => (
        <input key={m} type="hidden" name="materials" value={m} />
      ))}

      <Problems problems={problems} title={t.common.problems} />

      {result ? (
        <Notice tone={result.ok ? "neutral" : "care"}>{result.message}</Notice>
      ) : null}

      {/* ----------------------------------------------------------------- */}
      <Card className="space-y-5">
        <h2 className="text-section">{t.content.activitiesTitle}</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t.content.ageBand} htmlFor="age_band_code">
            <select
              id="age_band_code"
              name="age_band_code"
              defaultValue={activity?.age_band_code ?? taxonomy.ageBands[0]?.value}
              className={SELECT_CLASS}
            >
              {taxonomy.ageBands.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.content.ageMin} htmlFor="age_min_months">
            <Input
              id="age_min_months"
              name="age_min_months"
              type="number"
              min={0}
              max={72}
              value={ageMin}
              onChange={(e) => setAgeMin(Number.parseInt(e.target.value, 10) || 0)}
            />
          </Field>

          <Field label={t.content.ageMax} htmlFor="age_max_months">
            <Input
              id="age_max_months"
              name="age_max_months"
              type="number"
              min={1}
              max={72}
              defaultValue={activity?.age_max_months ?? 6}
            />
          </Field>

          <Field label={t.content.primaryDomain} htmlFor="primary_domain">
            <select
              id="primary_domain"
              name="primary_domain"
              defaultValue={activity?.primary_domain ?? taxonomy.domains[0]?.value}
              className={SELECT_CLASS}
            >
              {taxonomy.domains.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.content.duration} htmlFor="duration_minutes">
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min={1}
              max={60}
              defaultValue={activity?.duration_minutes ?? 10}
            />
          </Field>

          <Field label={t.content.difficulty} htmlFor="difficulty">
            <select
              id="difficulty"
              name="difficulty"
              defaultValue={String(activity?.difficulty ?? 1)}
              className={SELECT_CLASS}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.content.bondingLevel} htmlFor="bonding_level">
            <select
              id="bonding_level"
              name="bonding_level"
              defaultValue={String(activity?.bonding_level ?? 2)}
              className={SELECT_CLASS}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.content.musicMode} htmlFor="music_mode">
            <select
              id="music_mode"
              name="music_mode"
              defaultValue={activity?.music_mode ?? ""}
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

          <Field label={t.content.illustration} htmlFor="illustration_path">
            <Input
              id="illustration_path"
              name="illustration_path"
              defaultValue={activity?.illustration_path ?? ""}
              placeholder="/assets/scenes/…"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-5 border-t border-line pt-4">
          {(
            [
              ["is_premium", t.content.premium, activity?.is_premium ?? false],
              ["needs_supervision", t.content.needsSupervision, activity?.needs_supervision ?? true],
              ["screen_free", t.content.screenFree, activity?.screen_free ?? true],
              [
                "reviewed_by_expert",
                locale === "en" ? "Reviewed by an expert" : "Sudah ditinjau ahli",
                activity?.reviewed_by_expert ?? false,
              ],
            ] as const
          ).map(([name, label, checked]) => (
            <label key={name} className="text-small flex items-center gap-2">
              <input
                type="checkbox"
                name={name}
                defaultChecked={checked}
                className="size-4 accent-[var(--color-sage)]"
              />
              {label}
            </label>
          ))}
        </div>
      </Card>

      {/* ----------------------------------------------------------------- */}
      <Card className="space-y-4">
        <div>
          <h2 className="text-section">{t.content.materials}</h2>
          <p className="text-small mt-1 text-ink-muted">{t.content.materialsHelp}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {taxonomy.materials.map((m) => {
            const on = materials.includes(m.value);
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => toggleMaterial(m.value)}
                aria-pressed={on}
                className={cn(
                  "text-small rounded-pill border px-3 py-1.5 transition-colors",
                  on
                    ? "border-sage-dark bg-sage-soft text-sage-dark"
                    : "border-line bg-white text-ink-muted hover:border-sage",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ----------------------------------------------------------------- */}
      <Card className="space-y-4">
        <h2 className="text-section">{t.content.skills}</h2>
        {Object.entries(skillGroups).map(([group, skills]) => (
          <fieldset key={group}>
            <legend className="text-meta mb-1.5 text-ink-faint">{group}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {skills.map((s) => (
                <label key={s.value} className="text-small flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="skill_codes"
                    value={s.value}
                    defaultChecked={activity?.skill_codes.includes(s.value) ?? false}
                    className="size-4 accent-[var(--color-sage)]"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <fieldset className="border-t border-line pt-4">
          <legend className="text-meta mb-1.5 text-ink-faint">
            {t.content.secondaryDomains}
          </legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {taxonomy.domains.map((d) => (
              <label key={d.value} className="text-small flex items-center gap-2">
                <input
                  type="checkbox"
                  name="secondary_domains"
                  value={d.value}
                  defaultChecked={activity?.secondary_domains.includes(d.value) ?? false}
                  className="size-4 accent-[var(--color-sage)]"
                />
                {d.label}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      {/* ----------------------------------------------------------------- */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-section">
            {t.common.locale.id} &middot; {t.common.locale.en}
          </h2>
          <p className="text-small mt-1 text-ink-muted">{t.content.bothLocales}</p>
        </div>

        {(
          [
            ["title", t.content.titleField, false],
            ["summary", t.content.summary, true],
            ["learning_goal", t.content.learningGoal, true],
            ["materials_text", t.content.materialsText, false],
            ["parent_tip", t.content.parentTip, true],
          ] as const
        ).map(([key, label, long]) => (
          <div key={key} className="grid gap-3 lg:grid-cols-2">
            <Field label={`${label} · ID`} htmlFor={`${key}_id`}>
              {long ? (
                <Textarea
                  id={`${key}_id`}
                  name={`${key}_id`}
                  defaultValue={fieldsId[key]}
                  rows={2}
                />
              ) : (
                <Input id={`${key}_id`} name={`${key}_id`} defaultValue={fieldsId[key]} />
              )}
            </Field>
            <Field label={`${label} · EN`} htmlFor={`${key}_en`}>
              {long ? (
                <Textarea
                  id={`${key}_en`}
                  name={`${key}_en`}
                  defaultValue={fieldsEn[key]}
                  rows={2}
                />
              ) : (
                <Input id={`${key}_en`} name={`${key}_en`} defaultValue={fieldsEn[key]} />
              )}
            </Field>
          </div>
        ))}

        <div className="grid gap-3 border-t border-line pt-4 lg:grid-cols-2">
          <Field
            label={`${t.content.safety} · ID${needsSafety ? ` (${t.common.required})` : ""}`}
            help={needsSafety ? t.content.safetyHelp : undefined}
            htmlFor="safety_notes_id"
          >
            <Textarea
              id="safety_notes_id"
              name="safety_notes_id"
              defaultValue={fieldsId.safety_notes}
              rows={2}
              className={needsSafety && !fieldsId.safety_notes ? "border-[#e0bdb0]" : undefined}
            />
          </Field>
          <Field
            label={`${t.content.safety} · EN${needsSafety ? ` (${t.common.required})` : ""}`}
            htmlFor="safety_notes_en"
          >
            <Textarea
              id="safety_notes_en"
              name="safety_notes_en"
              defaultValue={fieldsEn.safety_notes}
              rows={2}
              className={needsSafety && !fieldsEn.safety_notes ? "border-[#e0bdb0]" : undefined}
            />
          </Field>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Field
            label={`${t.content.variations} · ID`}
            help={t.content.variationsHelp}
            htmlFor="variations_id"
          >
            <Textarea
              id="variations_id"
              name="variations_id"
              defaultValue={fieldsId.variations}
              rows={3}
            />
          </Field>
          <Field label={`${t.content.variations} · EN`} htmlFor="variations_en">
            <Textarea
              id="variations_en"
              name="variations_en"
              defaultValue={fieldsEn.variations}
              rows={3}
            />
          </Field>
        </div>
      </Card>

      {/* ----------------------------------------------------------------- */}
      <Card className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-section">{t.content.stepsHead}</h2>
          <span className="text-meta text-ink-faint">{stepRows.length}</span>
        </div>

        {stepRows.map((row, i) => (
          <div key={i} className="rounded-[16px] border border-line bg-white/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-meta text-ink-faint">
                {t.content.stepsHead} {i + 1}
              </span>
              {stepRows.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setStepRows((prev) => prev.filter((_, j) => j !== i))}
                  className="text-meta text-terracotta hover:underline"
                >
                  {t.content.removeStep}
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <Input
                  name={`step_title_id_${i}`}
                  defaultValue={row.id.title}
                  placeholder={`${t.content.stepTitle} · ID`}
                  aria-label={`${t.content.stepTitle} ID ${i + 1}`}
                />
                <Textarea
                  name={`step_body_id_${i}`}
                  defaultValue={row.id.body}
                  rows={3}
                  placeholder={`${t.content.stepBody} · ID`}
                  aria-label={`${t.content.stepBody} ID ${i + 1}`}
                />
              </div>
              <div className="space-y-2">
                <Input
                  name={`step_title_en_${i}`}
                  defaultValue={row.en.title}
                  placeholder={`${t.content.stepTitle} · EN`}
                  aria-label={`${t.content.stepTitle} EN ${i + 1}`}
                />
                <Textarea
                  name={`step_body_en_${i}`}
                  defaultValue={row.en.body}
                  rows={3}
                  placeholder={`${t.content.stepBody} · EN`}
                  aria-label={`${t.content.stepBody} EN ${i + 1}`}
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          tone="secondary"
          onClick={() => setStepRows((prev) => [...prev, { ...EMPTY_STEP }])}
        >
          {t.content.addStep}
        </Button>
      </Card>

      {/* ----------------------------------------------------------------- */}
      <div className="sticky bottom-0 -mx-5 border-t border-line bg-cream/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
          {activity ? (
            <span className="text-meta text-ink-faint">{activity.id}</span>
          ) : null}
        </div>
      </div>
    </form>
  );
}
