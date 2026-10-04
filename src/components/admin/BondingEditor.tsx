"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Notice, Textarea } from "@/components/ui";
import { Problems } from "@/components/admin/parts";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { saveBonding } from "@/lib/admin-actions";
import { MOMENT_TYPES, MUSIC_MODES } from "@/lib/admin/options";
import type { BondingMomentRow, BondingMomentTranslationRow } from "@/types/db";

/**
 * The bonding moment editor.
 *
 * A moment is one thing a parent says or does, in one breath, so the prompt
 * field is capped at the same 220 characters the validator enforces and the
 * counter is shown while typing. A hard limit here is kinder than a refusal
 * after the fact.
 */

const SELECT_CLASS =
  "w-full rounded-[14px] border border-line bg-white px-4 py-3 text-body text-ink focus:border-sage focus:outline-none";

const PROMPT_LIMIT = 220;

export function BondingEditor({
  locale,
  moment,
  translations,
  problems,
}: {
  locale: Locale;
  moment: BondingMomentRow | null;
  translations: {
    id: BondingMomentTranslationRow | null;
    en: BondingMomentTranslationRow | null;
  };
  problems: string[];
}) {
  const t = adminCopy(locale);
  const isNew = moment === null;

  const [promptId, setPromptId] = useState(translations.id?.prompt ?? "");
  const [promptEn, setPromptEn] = useState(translations.en?.prompt ?? "");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  function submit(data: FormData) {
    start(async () => {
      const r = await saveBonding(data);
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
      <input type="hidden" name="id" value={moment?.id ?? ""} />

      <Problems problems={problems} title={t.common.problems} />
      {result ? (
        <Notice tone={result.ok ? "neutral" : "care"}>{result.message}</Notice>
      ) : null}

      <Card className="space-y-5">
        <h2 className="text-section">{t.content.bondingTitle}</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t.content.momentType} htmlFor="moment_type">
            <select
              id="moment_type"
              name="moment_type"
              defaultValue={moment?.moment_type ?? "anytime"}
              className={SELECT_CLASS}
            >
              {MOMENT_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
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
              defaultValue={moment?.age_min_months ?? 0}
            />
          </Field>

          <Field label={t.content.ageMax} htmlFor="age_max_months">
            <Input
              id="age_max_months"
              name="age_max_months"
              type="number"
              min={1}
              max={72}
              defaultValue={moment?.age_max_months ?? 60}
            />
          </Field>

          <Field label={t.content.duration} htmlFor="duration_minutes">
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min={1}
              max={15}
              defaultValue={moment?.duration_minutes ?? 2}
            />
          </Field>

          <Field label={t.content.musicMode} htmlFor="music_mode">
            <select
              id="music_mode"
              name="music_mode"
              defaultValue={moment?.music_mode ?? ""}
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

          <Field label={locale === "en" ? "Order" : "Urutan"} htmlFor="sort_order">
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              defaultValue={moment?.sort_order ?? 0}
            />
          </Field>
        </div>

        <label className="text-small flex items-center gap-2 border-t border-line pt-4">
          <input
            type="checkbox"
            name="is_premium"
            defaultChecked={moment?.is_premium ?? false}
            className="size-4 accent-[var(--color-sage)]"
          />
          {t.content.premium}
        </label>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-section">
            {t.common.locale.id} &middot; {t.common.locale.en}
          </h2>
          <p className="text-small mt-1 text-ink-muted">{t.content.bothLocales}</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Field label={`${t.content.titleField} · ID`} htmlFor="title_id">
            <Input id="title_id" name="title_id" defaultValue={translations.id?.title ?? ""} />
          </Field>
          <Field label={`${t.content.titleField} · EN`} htmlFor="title_en">
            <Input id="title_en" name="title_en" defaultValue={translations.en?.title ?? ""} />
          </Field>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Field
            label={`${t.content.prompt} · ID`}
            help={`${promptId.length} / ${PROMPT_LIMIT}`}
            htmlFor="prompt_id"
          >
            <Textarea
              id="prompt_id"
              name="prompt_id"
              rows={3}
              maxLength={PROMPT_LIMIT}
              value={promptId}
              onChange={(e) => setPromptId(e.target.value)}
            />
          </Field>
          <Field
            label={`${t.content.prompt} · EN`}
            help={`${promptEn.length} / ${PROMPT_LIMIT}`}
            htmlFor="prompt_en"
          >
            <Textarea
              id="prompt_en"
              name="prompt_en"
              rows={3}
              maxLength={PROMPT_LIMIT}
              value={promptEn}
              onChange={(e) => setPromptEn(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Field label={`${t.content.whyItMatters} · ID`} htmlFor="why_it_matters_id">
            <Textarea
              id="why_it_matters_id"
              name="why_it_matters_id"
              rows={3}
              defaultValue={translations.id?.why_it_matters ?? ""}
            />
          </Field>
          <Field label={`${t.content.whyItMatters} · EN`} htmlFor="why_it_matters_en">
            <Textarea
              id="why_it_matters_en"
              name="why_it_matters_en"
              rows={3}
              defaultValue={translations.en?.why_it_matters ?? ""}
            />
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-5 border-t border-line bg-cream/95 px-5 py-4 backdrop-blur">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </form>
  );
}
